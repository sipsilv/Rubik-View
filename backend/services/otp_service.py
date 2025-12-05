# services/otp_service.py
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session

from core import otp
from notifications.manager import notification_manager

from models.otp_token import OTPToken
from models.user import User

from config import config as settings


class OTPService:

    @staticmethod
    async def request_otp(db: Session, user: User, payload):
        purpose = payload.purpose

        # Enforce resend window
        window = datetime.utcnow() - timedelta(seconds=settings.OTP_RESEND_SECONDS)
        recent = (
            db.query(OTPToken)
            .filter(
                OTPToken.user_id == user.id,
                OTPToken.purpose == purpose,
                OTPToken.created_at >= window,
            )
            .order_by(OTPToken.created_at.desc())
            .first()
        )

        if recent:
            raise HTTPException(status_code=429, detail="OTP already sent. Please wait.")

        # Generate OTP
        otp_obj, code = otp.create_otp(db, user, purpose)

        delivered = await notification_manager.send_telegram_message(
            user.telegram_chat_id,
            f"Your OTP for {purpose.replace('_', ' ').title()} is {code}. "
            f"Expires at {otp_obj.expires_at} UTC"
        )

        response = {"message": "OTP generated", "delivered": delivered}
        if not delivered:
            response["debug_code"] = code  # only for development
        return response


otp_service = OTPService()
