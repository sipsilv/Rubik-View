
from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db.session import Base


class AdminJob(Base):
    __tablename__ = "admin_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String, nullable=False)
    status = Column(String, default="pending")
    triggered_by = Column(String, default="manual")
    log_path = Column(String, nullable=True)
    details = Column(String, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
