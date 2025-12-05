from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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
