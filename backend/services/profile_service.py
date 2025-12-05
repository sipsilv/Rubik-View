# services/profile_service.py
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session

from core import security, otp, change_requests
from notifications.manager import notification_manager
from models.user import User


class ProfileService:

    @staticmethod
    def update_profile(db: Session, user: User, payload):
        # OTP validation
        if not otp.verify_otp(db, user, "PROFILE_UPDATE", payload.otp_code):
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")

        # Apply updates
        fields = payload.model_dump(exclude_unset=True)
        fields.pop("otp_code", None)

        for key, value in fields.items():
            setattr(user, key, value)

        db.commit()
        db.refresh(user)

        # Change request entry
        change_requests.create_change_request(
            db,
            user,
            request_type="PROFILE_UPDATE",
            status="completed",
            details=f"Updated fields: {', '.join(fields.keys())}",
        )

        # Telegram notify
        notification_manager.send_telegram_message(
            user.telegram_chat_id,
            f"Profile updated at {datetime.utcnow().isoformat()}",
        )

        return user

    @staticmethod
    def update_password(db: Session, user: User, payload):
        if not otp.verify_otp(db, user, "PASSWORD_CHANGE", payload.otp_code):
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")

        user.hashed_password = security.get_password_hash(payload.new_password)
        db.commit()
        db.refresh(user)

        change_requests.create_change_request(
            db,
            user,
            request_type="PASSWORD_CHANGE",
            status="completed",
            details="Password updated",
        )

        notification_manager.send_telegram_message(
            user.telegram_chat_id,
            f"Password updated at {datetime.utcnow().isoformat()}",
        )

        return user


profile_service = ProfileService()
