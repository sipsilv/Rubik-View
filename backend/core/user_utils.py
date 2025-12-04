"""
Utility functions for user management
"""
import random
import string
from sqlalchemy.orm import Session
from . import models


def generate_unique_userid(db: Session, full_name: str = None, phone_number: str = None, length: int = 8) -> str:
    """
    Generate a unique userid based on name and mobile combination
    Format: First 3 chars of name (uppercase) + last 4 digits of phone + random suffix if needed
    Example: JOH12345678 or JOH1234RV
    """
    import re
    
    # Extract first 3 characters from name (uppercase, alphanumeric only)
    name_part = ""
    if full_name:
        name_clean = re.sub(r'[^a-zA-Z0-9]', '', full_name.upper())
        name_part = name_clean[:3] if len(name_clean) >= 3 else name_clean.ljust(3, 'X')
    else:
        name_part = "USR"
    
    # Extract last 4 digits from phone number
    phone_part = ""
    if phone_number:
        digits_only = re.sub(r'[^0-9]', '', phone_number)
        phone_part = digits_only[-4:] if len(digits_only) >= 4 else digits_only.zfill(4)
    else:
        phone_part = ''.join(random.choices(string.digits, k=4))
    
    # Base userid: name_part + phone_part
    base_userid = f"{name_part}{phone_part}"
    
    # Check if base userid exists, if so add random suffix
    existing_user = db.query(models.User).filter(models.User.userid == base_userid).first()
    existing_request = db.query(models.PendingUserRequest).filter(models.PendingUserRequest.userid == base_userid).first()
    
    if not existing_user and not existing_request:
        return base_userid
    
    # If exists, add random suffix
    max_attempts = 100
    for _ in range(max_attempts):
        random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        userid = f"{base_userid}{random_suffix}"
        
        existing_user = db.query(models.User).filter(models.User.userid == userid).first()
        existing_request = db.query(models.PendingUserRequest).filter(models.PendingUserRequest.userid == userid).first()
        
        if not existing_user and not existing_request:
            return userid
    
    # Fallback: use timestamp-based ID
    from datetime import datetime
    timestamp = int(datetime.utcnow().timestamp())
    return f"{base_userid}{timestamp}"


def check_userid_unique(db: Session, userid: str, exclude_user_id: int = None) -> bool:
    """
    Check if userid is unique (not used by any user or pending request)
    Returns True if unique, False if already exists
    userid can be alphanumeric (no @ required)
    """
    if not userid:
        return False
    
    # Validate userid is alphanumeric (allow letters, numbers, underscore, hyphen)
    import re
    if not re.match(r'^[a-zA-Z0-9_-]+$', userid):
        return False
    
    # Check in users table
    query = db.query(models.User).filter(models.User.userid == userid)
    if exclude_user_id:
        query = query.filter(models.User.id != exclude_user_id)
    existing_user = query.first()
    
    if existing_user:
        return False
    
    # Check in pending requests (if not excluding a specific user)
    if not exclude_user_id:
        existing_request = db.query(models.PendingUserRequest).filter(models.PendingUserRequest.userid == userid).first()
        if existing_request:
            return False
    
    return True


def is_user_active_now(user: models.User, inactive_threshold_minutes: int = 5) -> bool:
    """
    Check if user is currently active based on last_activity timestamp
    Returns True if user was active within threshold, False otherwise
    """
    if not user.last_activity:
        return False
    
    from datetime import datetime, timedelta
    threshold = datetime.utcnow() - timedelta(minutes=inactive_threshold_minutes)
    return user.last_activity >= threshold

