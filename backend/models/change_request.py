from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db.session import Base

class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Legacy support
    userid = Column(String, ForeignKey("login_credentials.userid", ondelete="CASCADE"), nullable=True)  # New structure
    request_type = Column(String, nullable=False)
    status = Column(String, default="completed")
    details = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="change_requests", foreign_keys=[user_id])
    login_credentials = relationship("LoginCredentials", back_populates="change_requests", foreign_keys=[userid])
