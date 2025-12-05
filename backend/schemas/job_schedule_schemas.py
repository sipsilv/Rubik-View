from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Literal

JobScheduleType = Literal["daily", "weekly", "interval", "cron"]

class JobScheduleCreate(BaseModel):
    job_type: str  # "ohlcv_load" or "signal_process"
    schedule_type: JobScheduleType
    schedule_value: dict  # JSON object with schedule details
    is_active: bool = True

class JobScheduleUpdate(BaseModel):
    schedule_type: Optional[JobScheduleType] = None
    schedule_value: Optional[dict] = None
    is_active: Optional[bool] = None

class JobScheduleResponse(BaseModel):
    id: int
    job_type: str
    schedule_type: str
    schedule_value: str  # JSON string
    is_active: bool
    next_run_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None

    class Config:
        from_attributes = True