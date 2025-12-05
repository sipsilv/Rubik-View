from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
from schemas.user_schemas import User

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
