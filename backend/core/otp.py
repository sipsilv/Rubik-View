import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Tuple

from sqlalchemy.orm import Session

from . import models
from .config import settings


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def _generate_code() -> str:
    length = max(4, settings.OTP_CODE_LENGTH)
    return "".join(secrets.choice("0123456789") for _ in range(length))


def create_otp(db: Session, user: models.User, purpose: str) -> Tuple[models.OTPToken, str]:
    """
    Create a fresh OTP for a user and return both the model and the raw code.
    """
    code = _generate_code()
    code_hash = _hash_code(code)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    otp = models.OTPToken(
        user_id=user.id,
        purpose=purpose,
        code_hash=code_hash,
        expires_at=expires_at,
        is_used=False,
    )
    db.add(otp)
    db.commit()
    db.refresh(otp)
    return otp, code


def verify_otp(db: Session, user: models.User, purpose: str, code: str) -> bool:
    """
    Validate the provided code for the user and purpose combination.
    """
    now = datetime.utcnow()
    code_hash = _hash_code(code)

    otp = (
        db.query(models.OTPToken)
        .filter(
            models.OTPToken.user_id == user.id,
            models.OTPToken.purpose == purpose,
            models.OTPToken.is_used.is_(False),
            models.OTPToken.expires_at >= now,
        )
        .order_by(models.OTPToken.created_at.desc())
        .first()
    )

    if not otp:
        return False

    if otp.code_hash != code_hash:
        return False

    otp.is_used = True
    db.commit()
    return True

