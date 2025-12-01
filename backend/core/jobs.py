import json
import logging
import os
import signal
import subprocess
import sys
import threading
from datetime import datetime
from typing import Dict

from sqlalchemy.orm import Session

from . import models, database
from .config import settings

logger = logging.getLogger(__name__)

LOG_DIR = os.path.join(settings.BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

SCRIPT_MAP: Dict[str, str] = {
    "ohlcv_load": os.path.join(settings.BASE_DIR, "Data", "OHCLV Data", "update_stocks_ohlcv.py"),
    "signal_process": os.path.join(settings.BASE_DIR, "Engine", "indicator_runner.py"),
}

# In-memory map of running processes keyed by AdminJob.id
PROCESS_MAP: Dict[int, subprocess.Popen] = {}

def _job_is_running(db: Session, job_type: str) -> bool:
    return (
        db.query(models.AdminJob)
        .filter(models.AdminJob.job_type == job_type, models.AdminJob.status == "running")
        .first()
        is not None
    )


def start_job(db: Session, job_type: str, triggered_by: str = "manual") -> models.AdminJob:
    script_path = SCRIPT_MAP.get(job_type)
    if not script_path:
        raise ValueError(f"Unknown job type: {job_type}")
    if not os.path.exists(script_path):
        raise FileNotFoundError(f"Script not found for {job_type}: {script_path}")
    if _job_is_running(db, job_type):
        raise RuntimeError(f"{job_type} job is already running.")

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    log_path = os.path.join(LOG_DIR, f"{job_type}_{timestamp}.log")

    job = models.AdminJob(
        job_type=job_type,
        status="running",
        triggered_by=triggered_by,
        log_path=log_path,
        started_at=datetime.utcnow(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    worker = threading.Thread(
        target=_execute_job, args=(job.id, script_path, log_path, job_type), daemon=True
    )
    worker.start()
    return job


def _execute_job(job_id: int, script_path: str, log_path: str, job_type: str) -> None:
    session = database.SessionLocal()
    return_code = None
    try:
        # Inherit environment but disable Excel-based progress updates for backend jobs
        env = os.environ.copy()
        env["RUBIKVIEW_DISABLE_EXCEL"] = "1"
        with open(log_path, "w", encoding="utf-8") as log_file:
            process = subprocess.Popen(
                [sys.executable, script_path],
                stdout=log_file,
                stderr=log_file,
                cwd=settings.BASE_DIR,
                env=env,
            )
            PROCESS_MAP[job_id] = process

            # Persist PID early so that stop_job can still find and kill the process
            job = session.get(models.AdminJob, job_id)
            if job and job.status == "running":
                try:
                    details = json.loads(job.details) if job.details else {}
                except Exception:
                    details = {}
                details["pid"] = process.pid
                job.details = json.dumps(details)
                session.add(job)
                session.commit()

            return_code = process.wait()

        # Process finished, remove handle if still present
        PROCESS_MAP.pop(job_id, None)
        job = session.get(models.AdminJob, job_id)
        if job:
            # If the job has been explicitly stopped, don't overwrite its status
            if job.status == "running":
                job.status = "completed" if return_code == 0 else "failed"
                job.finished_at = datetime.utcnow()
                # Preserve any existing details (like pid) and append return code
                try:
                    details = json.loads(job.details) if job.details else {}
                except Exception:
                    details = {}
                details["returncode"] = return_code
                job.details = json.dumps(details)
                session.add(job)
                session.commit()
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("Job %s failed to execute: %s", job_type, exc)
        job = session.get(models.AdminJob, job_id)
        if job:
            if job.status == "running":
                job.status = "failed"
                job.finished_at = datetime.utcnow()
                job.details = json.dumps({"error": str(exc)})
                session.add(job)
                session.commit()
    finally:
        session.close()

    if return_code == 0 and job_type == "ohlcv_load":
        _auto_trigger_signal_job()


def _auto_trigger_signal_job() -> None:
    session = database.SessionLocal()
    try:
        if _job_is_running(session, "signal_process"):
            return
        try:
            start_job(session, "signal_process", triggered_by="auto")
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.error("Auto signal job failed: %s", exc)
    finally:
        session.close()


def stop_job(db: Session, job_id: int) -> models.AdminJob:
    """
    Attempt to stop a running background job by terminating its subprocess.
    """
    job = db.query(models.AdminJob).filter(models.AdminJob.id == job_id).first()
    if not job:
        raise ValueError("Job not found")
    if job.status != "running":
        raise RuntimeError("Job is not currently running")

    proc = PROCESS_MAP.get(job_id)

    # Try to fall back to PID stored in job.details if in-memory handle is missing
    pid = None
    try:
        if job.details:
            details = json.loads(job.details)
            pid = details.get("pid")
    except Exception:
        pid = None

    return_code = None
    try:
        if proc:
            proc.terminate()
            try:
                return_code = proc.wait(timeout=10)
            except Exception:
                proc.kill()
                return_code = proc.wait(timeout=5)
        elif pid:
            # Best-effort kill by PID (e.g. after a reload where PROCESS_MAP was lost)
            try:
                os.kill(int(pid), signal.SIGTERM)
                return_code = 0
            except Exception as exc:  # pragma: no cover - defensive
                logger.error("Failed to kill job %s with pid %s: %s", job_id, pid, exc)
                raise RuntimeError("Job process handle not available")
        else:
            raise RuntimeError("Job process handle not available")
    finally:
        PROCESS_MAP.pop(job_id, None)

    job.status = "stopped"
    job.finished_at = datetime.utcnow()
    try:
        details = json.loads(job.details) if job.details else {}
    except Exception:
        details = {}
    details.update({"stopped": True, "returncode": return_code})
    job.details = json.dumps(details)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

