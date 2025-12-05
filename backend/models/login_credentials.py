from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db.session import Base

class LoginCredentials(Base):
    """Table 1: UserID and Password - userid is unique and immutable once created"""
    __tablename__ = "login_credentials"

    id = Column(Integer, primary_key=True, index=True)
    userid = Column(String, unique=True, index=True, nullable=False)  # Unique, immutable user ID
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_details = relationship("UserDetails", back_populates="login_credentials", uselist=False, cascade="all, delete-orphan")
    otp_tokens = relationship("OTPToken", back_populates="login_credentials", cascade="all, delete-orphan")
    change_requests = relationship("ChangeRequest", back_populates="login_credentials", cascade="all, delete-orphan")