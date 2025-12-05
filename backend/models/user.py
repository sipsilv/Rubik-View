from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db.session import Base


class User(Base):
    """Legacy User table - will be migrated to LoginCredentials + UserDetails"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    userid = Column(String, unique=True, index=True, nullable=True)  # Unique user ID
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    full_name = Column(String, nullable=True)
    role = Column(String, default="user")
    phone_number = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    last_activity = Column(DateTime, nullable=True)  # Track last activity timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    otp_tokens = relationship("OTPToken", back_populates="user", cascade="all, delete-orphan", foreign_keys="OTPToken.user_id")
    change_requests = relationship("ChangeRequest", back_populates="user", cascade="all, delete-orphan", foreign_keys="ChangeRequest.user_id")
