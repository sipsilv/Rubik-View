from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ContactAdminRequest(BaseModel):
    full_name: str
    email: str
    phone_number: str
    age: int
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    message: Optional[str] = None

class UserRequestResponse(BaseModel):
    id: int
    userid: str
    full_name: str
    email: str
    phone_number: str
    age: int
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    message: Optional[str] = None
    status: str
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PendingUserRequestResponse(UserRequestResponse):
    pass