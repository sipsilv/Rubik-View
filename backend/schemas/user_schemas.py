from datetime import datetime
from pydantic import BaseModel, EmailStr, constr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: constr(max_length=72)
    full_name: Optional[str] = None

class AdminUserCreate(UserCreate):
    role: str = "user"
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

class User(BaseModel):
    id: int
    email: EmailStr
    userid: Optional[str] = None
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
    last_activity: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserDetail(User):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
