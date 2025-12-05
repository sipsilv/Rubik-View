from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db.session import Base

class PendingUserRequest(Base):
    """Legacy table - will be migrated to UserRequests"""
    __tablename__ = "pending_user_requests"

    id = Column(Integer, primary_key=True, index=True)
    userid = Column(String, unique=True, index=True, nullable=False)  # Auto-generated unique userid
    full_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    message = Column(String, nullable=True)  # Additional message from user
    status = Column(String, default="pending")  # "pending", "approved", "rejected"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Link to created user
    resolved_at = Column(DateTime, nullable=True)  # When the request was resolved (approved/rejected)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")