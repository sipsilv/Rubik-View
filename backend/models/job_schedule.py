from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db.session import Base

class JobSchedule(Base):
    __tablename__ = "job_schedules"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String, nullable=False)  # "ohlcv_load", "signal_process"
    schedule_type = Column(String, nullable=False)  # "daily", "weekly", "interval", "cron"
    schedule_value = Column(String, nullable=False)  # JSON string with schedule details
    is_active = Column(Boolean, default=True)
    next_run_at = Column(DateTime, nullable=True)
    last_run_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Legacy support
    # created_by_userid = Column(String, ForeignKey("logincredentials.userid"), nullable=True)