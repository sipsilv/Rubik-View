import json
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.job_schedule import JobSchedule
from core import scheduler


class ScheduleService:

    def list_schedules(self, db: Session, job_type: str):
        q = db.query(JobSchedule)
        if job_type:
            q = q.filter(JobSchedule.job_type == job_type)
        return q.order_by(JobSchedule.created_at.desc()).all()

    def create_schedule(self, db: Session, data, current_user):
        schedule = JobSchedule(
            job_type=data.job_type,
            schedule_type=data.schedule_type,
            schedule_value=json.dumps(data.schedule_value),
            is_active=data.is_active,
            created_by=current_user.id,
        )

        if scheduler:
            schedule.next_run_at = scheduler.calculate_next_run(schedule)

        db.add(schedule)
        db.commit()
        db.refresh(schedule)

        if schedule.is_active and scheduler:
            scheduler.add_scheduled_job(schedule, db)

        return schedule

    def update_schedule(self, db: Session, schedule_id: int, data):
        schedule = db.query(JobSchedule).filter(JobSchedule.id == schedule_id).first()
        if not schedule:
            raise HTTPException(404, "Schedule not found")

        if data.schedule_type is not None:
            schedule.schedule_type = data.schedule_type

        if data.schedule_value is not None:
            schedule.schedule_value = json.dumps(data.schedule_value)

        if data.is_active is not None:
            schedule.is_active = data.is_active

        if scheduler:
            schedule.next_run_at = scheduler.calculate_next_run(schedule)

        db.commit()
        db.refresh(schedule)

        if scheduler:
            scheduler.update_scheduled_job(schedule, db)

        return schedule

    def delete_schedule(self, db: Session, schedule_id: int):
        schedule = db.query(JobSchedule).filter(JobSchedule.id == schedule_id).first()
        if not schedule:
            raise HTTPException(404, "Schedule not found")

        if scheduler:
            scheduler.remove_scheduled_job(schedule_id)

        db.delete(schedule)
        db.commit()


schedule_service = ScheduleService()
