from pydantic import BaseModel
from typing import Literal

class OTPRequest(BaseModel):
    purpose: Literal["PROFILE_UPDATE", "PASSWORD_CHANGE", "ADMIN_ACTION"]
