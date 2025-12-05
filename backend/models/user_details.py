from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db.session import Base

class UserDetails(Base):
    """Table 2: Full user details - connected to LoginCredentials via userid"""
    __tablename__ = "user_details"

    id = Column(Integer, primary_key=True, index=True)
    userid = Column(String, ForeignKey("login_credentials.userid", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    last_activity = Column(DateTime, nullable=True)  # Track last activity timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    login_credentials = relationship("LoginCredentials", back_populates="user_details")
    user_feedback = relationship("UserFeedback", back_populates="user_details", cascade="all, delete-orphan")