from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from schemas.user_schemas import User

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
