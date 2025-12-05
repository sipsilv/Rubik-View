from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db.session import Base


class UserRequests(Base):
    """Table 3: User registration requests from Contact Admin form - connected via userid"""
    __tablename__ = "user_requests"

    id = Column(Integer, primary_key=True, index=True)
    userid = Column(String, unique=True, index=True, nullable=False)  # Auto-generated unique userid
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    message = Column(String, nullable=True)  # Additional message from user
    status = Column(String, default="pending")  # "pending", "approved", "rejected"
    resolved_at = Column(DateTime, nullable=True)  # When the request was resolved (approved/rejected)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)