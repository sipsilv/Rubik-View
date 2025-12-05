from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db.session import Base

class OTPToken(Base):
    __tablename__ = "otp_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Legacy support
    userid = Column(String, ForeignKey("login_credentials.userid", ondelete="CASCADE"), nullable=True)  # New structure
    purpose = Column(String, nullable=False)
    code_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="otp_tokens", foreign_keys=[user_id])
    login_credentials = relationship("LoginCredentials", back_populates="otp_tokens", foreign_keys=[userid])
