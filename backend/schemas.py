from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal, List

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    full_name: Optional[str] = None

class AdminUserCreate(UserCreate):
    role: str = Field(default="user")
    phone_number: Optional[str] = None
    age: Optional[int] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    telegram_chat_id: Optional[str] = None

class UserLogin(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    age: Optional[int] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    role: str

    class Config:
        from_attributes = True

from datetime import datetime
class UserDetail(User):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    age: Optional[int] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    age: Optional[int] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    otp_code: str

class UserPasswordChange(BaseModel):
    new_password: str
    otp_code: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    email: Optional[str] = None

class SendCredentialsRequest(BaseModel):
    message: str

class OTPRequest(BaseModel):
    purpose: Literal["PROFILE_UPDATE", "PASSWORD_CHANGE", "ADMIN_ACTION"]


class ChangeRequest(BaseModel):
    id: int
    user_id: int
    request_type: str
    status: str
    details: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    user: Optional[User] = None

    class Config:
        from_attributes = True


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


class SignalStatus(BaseModel):
    job_id: Optional[int] = None
    status: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    total_symbols: int = 0
    processed_symbols: int = 0
    processed: int = 0
    uptodate: int = 0
    skipped: int = 0
    errors: int = 0
    last_symbol: Optional[str] = None
    last_message: Optional[str] = None
    percent_complete: float = 0.0
    log_preview: Optional[list[str]] = None


class IndicatorConfigBase(BaseModel):
    indicator_name: str
    description: Optional[str] = None
    active: bool = True
    parameter_1: Optional[int] = None
    parameter_2: Optional[int] = None
    parameter_3: Optional[int] = None
    manual_weight: Optional[float] = None
    use_ai_weight: bool = False
    ai_latest_weight: Optional[float] = None


class IndicatorConfigCreate(IndicatorConfigBase):
    pass


class IndicatorConfigUpdate(BaseModel):
    indicator_name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None
    parameter_1: Optional[int] = None
    parameter_2: Optional[int] = None
    parameter_3: Optional[int] = None
    manual_weight: Optional[float] = None
    use_ai_weight: Optional[bool] = None
    ai_latest_weight: Optional[float] = None


class IndicatorConfig(IndicatorConfigBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# User Feedback schemas
FeedbackType = Literal["feedback", "feature_request", "bug_report"]
FeedbackStatus = Literal["pending", "reviewed", "in_progress", "completed", "rejected"]


class UserFeedbackCreate(BaseModel):
    feedback_type: FeedbackType
    title: str
    description: Optional[str] = None


class UserFeedbackUpdate(BaseModel):
    status: Optional[FeedbackStatus] = None
    admin_notes: Optional[str] = None


class UserFeedbackResponse(BaseModel):
    id: int
    user_id: int
    feedback_type: str
    title: str
    description: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user: Optional[User] = None

    class Config:
        from_attributes = True


# Job Schedule Schemas
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
