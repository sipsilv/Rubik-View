from pydantic import BaseModel
from typing import Optional

class AdminUserUpdate(BaseModel):
    userid: Optional[str] = None
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
