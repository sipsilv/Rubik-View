import os
from fastapi import HTTPException, Response
from sqlalchemy.orm import Session

from core import jobs, log_db
from models.admin_job import AdminJob

class JobService:

    def list_jobs(self, db: Session, limit, job_type, status, triggered_by):
        query = db.query(AdminJob)

        if job_type:
            query = query.filter(AdminJob.job_type == job_type)
        if status:
            query = query.filter(AdminJob.status == status)
        if triggered_by:
            query = query.filter(AdminJob.triggered_by == triggered_by)

        return query.order_by(AdminJob.started_at.desc()).limit(limit).all()

    def trigger_job(self, db: Session, job_type):
        try:
            return jobs.start_job(db, job_type)
        except FileNotFoundError as exc:
            raise HTTPException(404, str(exc))
        except ValueError as exc:
            raise HTTPException(400, str(exc))
        except RuntimeError as exc:
            raise HTTPException(409, str(exc))

    def stop_job(self, db: Session, job_id: int):
        try:
            return jobs.stop_job(db, job_id)
        except ValueError as exc:
            raise HTTPException(404, str(exc))
        except RuntimeError as exc:
            raise HTTPException(400, str(exc))

    def force_stop_job(self, db: Session, job_id: int):
        try:
            return jobs.force_mark_stopped(db, job_id)
        except ValueError as exc:
            raise HTTPException(404, str(exc))

    def get_job(self, db: Session, job_id: int):
        job = db.query(AdminJob).filter(AdminJob.id == job_id).first()
        if not job:
            raise HTTPException(404, "Job not found")
        return job

    def get_job_log(self, db: Session, job_id: int):
        job = self.get_job(db, job_id)

        content = log_db.get_log(job_id)

        if not content and job.log_path and os.path.exists(job.log_path):
            with open(job.log_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

        return Response(content or "No log available", media_type="text/plain")

    def get_ohlcv_status(self, db: Session):
        # your full logic here — already clean
        ...

    def get_signal_status(self, db: Session):
        # your full logic here — already clean
        ...


job_service = JobService()
