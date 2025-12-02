import json
import logging
import os
import signal
import subprocess
import sys
import threading
import time
from datetime import datetime
from typing import Dict

from sqlalchemy.orm import Session

from . import models, database, log_db
from .config import settings

logger = logging.getLogger(__name__)

# Ensure DB is initialized
log_db.init_db()

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

    job = models.AdminJob(
        job_type=job_type,
        status="running",
        triggered_by=triggered_by,
        log_path="DB", # Marker to indicate DB logging
        started_at=datetime.utcnow(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    worker = threading.Thread(
        target=_execute_job, args=(job.id, script_path, job_type), daemon=True
    )
    worker.start()
    return job


def _execute_job(job_id: int, script_path: str, job_type: str) -> None:
    session = database.SessionLocal()
    return_code = None
    try:
        # Inherit environment but disable Excel-based progress updates for backend jobs
        env = os.environ.copy()
        env["RUBIKVIEW_DISABLE_EXCEL"] = "1"
        # Force unbuffered Python output so logs appear in real-time.
        env["PYTHONUNBUFFERED"] = "1"
        
        process = subprocess.Popen(
            [sys.executable, "-u", script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, # Merge stderr into stdout
            cwd=settings.BASE_DIR,
            env=env,
            text=True, # Text mode
            bufsize=1, # Line buffered
        )
        PROCESS_MAP[job_id] = process

        # Persist PID
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

        # Read output in a loop
        while True:
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            if line:
                log_db.append_log(job_id, line)
        
        return_code = process.poll()

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
            # No live process handle is available – caller may choose to use a
            # separate "force stop" path that simply marks the job as stopped.
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


def force_mark_stopped(db: Session, job_id: int) -> models.AdminJob:
    """
    Force-mark a job as stopped in the database, without requiring a live
    subprocess handle. This is useful for cleaning up "stuck" jobs where the
    underlying OS process has already exited or could not be tracked.
    """
    job = db.query(models.AdminJob).filter(models.AdminJob.id == job_id).first()
    if not job:
        raise ValueError("Job not found")

    # If the job is already in a terminal state, just return it as-is
    if job.status in {"completed", "failed", "stopped"}:
        return job

    job.status = "stopped"
    job.finished_at = datetime.utcnow()
    try:
        details = json.loads(job.details) if job.details else {}
    except Exception:
        details = {}
    details.update({"forced_stop": True})
    job.details = json.dumps(details)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job
