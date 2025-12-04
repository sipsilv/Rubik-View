from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# ============================================================================
# NEW THREE-TABLE STRUCTURE
# ============================================================================

class LoginCredentials(Base):
    """Table 1: UserID and Password - userid is unique and immutable once created"""
    __tablename__ = "logincredentials"

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


class UserDetails(Base):
    """Table 2: Full user details - connected to LoginCredentials via userid"""
    __tablename__ = "userdetails"

    id = Column(Integer, primary_key=True, index=True)
    userid = Column(String, ForeignKey("logincredentials.userid", ondelete="CASCADE"), unique=True, index=True, nullable=False)
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


class UserRequests(Base):
    """Table 3: User registration requests from Contact Admin form - connected via userid"""
    __tablename__ = "userrequests"

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


# ============================================================================
# EXISTING TABLES (Keep for backward compatibility during migration)
# ============================================================================

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


# ============================================================================
# SUPPORTING TABLES
# ============================================================================

class OTPToken(Base):
    __tablename__ = "otp_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Legacy support
    userid = Column(String, ForeignKey("logincredentials.userid", ondelete="CASCADE"), nullable=True)  # New structure
    purpose = Column(String, nullable=False)
    code_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="otp_tokens", foreign_keys=[user_id])
    login_credentials = relationship("LoginCredentials", back_populates="otp_tokens", foreign_keys=[userid])


class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Legacy support
    userid = Column(String, ForeignKey("logincredentials.userid", ondelete="CASCADE"), nullable=True)  # New structure
    request_type = Column(String, nullable=False)
    status = Column(String, default="completed")
    details = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="change_requests", foreign_keys=[user_id])
    login_credentials = relationship("LoginCredentials", back_populates="change_requests", foreign_keys=[userid])


class AdminJob(Base):
    __tablename__ = "admin_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String, nullable=False)
    status = Column(String, default="pending")
    triggered_by = Column(String, default="manual")
    log_path = Column(String, nullable=True)
    details = Column(String, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)


class JobSchedule(Base):
    __tablename__ = "job_schedules"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String, nullable=False)  # "ohlcv_load", "signal_process"
    schedule_type = Column(String, nullable=False)  # "daily", "weekly", "interval", "cron"
    schedule_value = Column(String, nullable=False)  # JSON string with schedule details
    is_active = Column(Boolean, default=True)
    next_run_at = Column(DateTime, nullable=True)
    last_run_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Legacy support
    # created_by_userid = Column(String, ForeignKey("logincredentials.userid"), nullable=True)  # New structure - commented out until migration


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


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Legacy support
    userid = Column(String, ForeignKey("userdetails.userid", ondelete="CASCADE"), nullable=True)  # New structure
    feedback_type = Column(String, nullable=False)  # "feedback", "feature_request", "bug_report"
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="pending")  # "pending", "reviewed", "in_progress", "completed", "rejected"
    admin_notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    user_details = relationship("UserDetails", back_populates="user_feedback", foreign_keys=[userid])
