from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Literal

JobType = Literal["ohlcv_load", "signal_process"]

class AdminJob(BaseModel):
    id: int
    job_type: JobType
    status: str
    triggered_by: str
    log_path: Optional[str] = None
    details: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OHCLVStatus(BaseModel):
    job_id: Optional[int] = None
    status: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    total_symbols: int = 0
    processed_symbols: int = 0
    success: int = 0
    failed: int = 0
    skipped: int = 0
    uptodate: int = 0
    last_symbol: Optional[str] = None
    last_message: Optional[str] = None
    percent_complete: float = 0.0
    log_preview: Optional[list[str]] = None


class SignalStatus(OHCLVStatus):
    errors: int = 0
    processed: int = 0
