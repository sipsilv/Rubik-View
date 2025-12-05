from pydantic import BaseModel
from datetime import datetime

class UserDetailCombined(BaseModel):
    id: int
    userid: str
    email: str
    full_name: str | None = None
    phone_number: str | None = None
    age: int | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None
    role: str
    is_active: bool
    last_activity: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
