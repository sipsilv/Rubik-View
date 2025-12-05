from pydantic import BaseModel
from datetime import datetime

class LoginCredentialsResponse(BaseModel):
    id: int
    userid: str
    is_active: bool
    role: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

class SendCredentialsRequest(BaseModel):
    message: str