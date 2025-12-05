import json
import logging
from datetime import datetime, timedelta
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from sqlalchemy.orm import Session

from . import jobs
from db.session import SessionLocal

from models.job_schedule import JobSchedule


logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = BackgroundScheduler(daemon=True)

def init_scheduler():
    """Initialize and start the scheduler"""
    if not scheduler.running:
        scheduler.start()
        logger.info("Job scheduler started")
    
    # Load existing schedules from database
    db = SessionLocal()
    try:
        active_schedules = db.query(JobSchedule).filter(JobSchedule.is_active == True).all()
        for schedule in active_schedules:
            try:
                add_scheduled_job(schedule, db=db)
            except Exception as e:
                logger.error(f"Failed to load schedule {schedule.id}: {e}")
    finally:
        db.close()

def get_trigger_from_schedule(schedule: JobSchedule):
    """Convert schedule model to APScheduler trigger"""
    schedule_data = json.loads(schedule.schedule_value)
    schedule_type = schedule.schedule_type
    
    if schedule_type == "daily":
        # {"hour": 9, "minute": 0}
        hour = schedule_data.get("hour", 9)
        minute = schedule_data.get("minute", 0)
        return CronTrigger(hour=hour, minute=minute)
    
    elif schedule_type == "weekly":
        # {"day_of_week": 0, "hour": 9, "minute": 0}  # 0 = Monday
        day = schedule_data.get("day_of_week", 0)
        hour = schedule_data.get("hour", 9)
        minute = schedule_data.get("minute", 0)
        return CronTrigger(day_of_week=day, hour=hour, minute=minute)
    
    elif schedule_type == "interval":
        # {"hours": 6} or {"minutes": 30}
        if "hours" in schedule_data:
            return IntervalTrigger(hours=schedule_data["hours"])
        elif "minutes" in schedule_data:
            return IntervalTrigger(minutes=schedule_data["minutes"])
        elif "days" in schedule_data:
            return IntervalTrigger(days=schedule_data["days"])
        else:
            raise ValueError("Invalid interval schedule")
    
    elif schedule_type == "cron":
        # {"minute": "0", "hour": "9", "day": "*", "month": "*", "day_of_week": "*"}
        return CronTrigger(
            minute=schedule_data.get("minute", "*"),
            hour=schedule_data.get("hour", "*"),
            day=schedule_data.get("day", "*"),
            month=schedule_data.get("month", "*"),
            day_of_week=schedule_data.get("day_of_week", "*"),
        )
    
    else:
        raise ValueError(f"Unknown schedule type: {schedule_type}")

def calculate_next_run(schedule: JobSchedule) -> Optional[datetime]:
    """Calculate the next run time for a schedule"""
    try:
        trigger = get_trigger_from_schedule(schedule)
        now = datetime.utcnow()
        # APScheduler triggers have get_next_fire_time that takes (previous_fire_time, now)
        # For first run, previous_fire_time is None
        next_run = trigger.get_next_fire_time(None, now)
        return next_run
    except Exception as e:
        logger.error(f"Failed to calculate next run for schedule {schedule.id}: {e}")
        return None

def add_scheduled_job(schedule: JobSchedule, db: Optional[Session] = None):
    """Add a job to the scheduler"""
    job_id = f"schedule_{schedule.id}"
    
    # Remove existing job if present
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    
    trigger = get_trigger_from_schedule(schedule)
    
    def run_scheduled_job():
        """Wrapper function to run the scheduled job"""
        db_session = SessionLocal()
        try:
            logger.info(f"Running scheduled job: {schedule.job_type} (schedule ID: {schedule.id})")
            jobs.start_job(db_session, schedule.job_type, triggered_by="auto")
            
            # Update last_run_at
            schedule_record = db_session.query(JobSchedule).filter(JobSchedule.id == schedule.id).first()
            if schedule_record:
                schedule_record.last_run_at = datetime.utcnow()
                schedule_record.next_run_at = calculate_next_run(schedule_record)
                db_session.commit()
        except Exception as e:
            logger.error(f"Error running scheduled job {schedule.id}: {e}")
        finally:
            db_session.close()
    
    scheduler.add_job(
        run_scheduled_job,
        trigger=trigger,
        id=job_id,
        replace_existing=True,
        max_instances=1,
    )
    
    # Update next_run_at in database
    if db:
        schedule.next_run_at = calculate_next_run(schedule)
        db.commit()
    else:
        db_session = SessionLocal()
        try:
            schedule_record = db_session.query(JobSchedule).filter(JobSchedule.id == schedule.id).first()
            if schedule_record:
                schedule_record.next_run_at = calculate_next_run(schedule)
                db_session.commit()
        finally:
            db_session.close()
    
    logger.info(f"Added scheduled job: {schedule.job_type} with trigger {schedule.schedule_type}")

def remove_scheduled_job(schedule_id: int):
    """Remove a job from the scheduler"""
    job_id = f"schedule_{schedule_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        logger.info(f"Removed scheduled job: {job_id}")

def update_scheduled_job(schedule: JobSchedule, db: Optional[Session] = None):
    """Update an existing scheduled job"""
    if schedule.is_active:
        add_scheduled_job(schedule, db)
    else:
        remove_scheduled_job(schedule.id)

