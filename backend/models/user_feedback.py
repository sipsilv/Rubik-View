from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db.session import Base


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Legacy support
    userid = Column(String, ForeignKey("user_details.userid", ondelete="CASCADE"), nullable=True)  # New structure
    feedback_type = Column(String, nullable=False)  # "feedback", "feature_request", "bug_report"
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="pending")  # "pending", "reviewed", "in_progress", "completed", "rejected"
    admin_notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    user_details = relationship("UserDetails", back_populates="user_feedback", foreign_keys=[userid])
