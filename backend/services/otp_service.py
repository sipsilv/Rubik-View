# services/otp_service.py
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session

from core import models, otp, notifications
from core.config import settings


class OTPService:

    @staticmethod
    def request_otp(db: Session, user: models.User, payload):
        purpose = payload.purpose

        # Enforce resend window
        window = datetime.utcnow() - timedelta(seconds=settings.OTP_RESEND_SECONDS)
        recent = (
            db.query(models.OTPToken)
            .filter(
                models.OTPToken.user_id == user.id,
                models.OTPToken.purpose == purpose,
                models.OTPToken.created_at >= window,
            )
            .order_by(models.OTPToken.created_at.desc())
            .first()
        )

        if recent:
            raise HTTPException(status_code=429, detail="OTP already sent. Please wait.")

        # Generate OTP
        otp_obj, code = otp.create_otp(db, user, purpose)

        delivered = notifications.send_telegram_message(
            user.telegram_chat_id,
            f"Your OTP for {purpose.replace('_', ' ').title()} is {code}. "
            f"Expires at {otp_obj.expires_at} UTC"
        )

        response = {"message": "OTP generated", "delivered": delivered}
        if not delivered:
            response["debug_code"] = code  # only for development
        return response


otp_service = OTPService()
