from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db.session import Base

class IndicatorConfig(Base):
    __tablename__ = "indicator_configs"

    id = Column(Integer, primary_key=True, index=True)
    indicator_name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    parameter_1 = Column(Integer, nullable=True)
    parameter_2 = Column(Integer, nullable=True)
    parameter_3 = Column(Integer, nullable=True)
    manual_weight = Column(String, nullable=True)
    use_ai_weight = Column(Boolean, default=False)
    ai_latest_weight = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)