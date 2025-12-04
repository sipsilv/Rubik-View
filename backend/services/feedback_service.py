# services/feedback_service.py
from fastapi import HTTPException
from sqlalchemy.orm import Session

from core import models, user_utils


class FeedbackService:

    # ---------- Pending User Requests ----------
    @staticmethod
    def create_pending_request(db: Session, data):
        userid = user_utils.generate_unique_userid(db, data.full_name, data.phone_number)

        req = models.PendingUserRequest(
            userid=userid,
            full_name=data.full_name,
            email=data.email,
            phone_number=data.phone_number,
            age=data.age,
            address_line1=data.address_line1,
            address_line2=data.address_line2,
            city=data.city,
            state=data.state,
            postal_code=data.postal_code,
            country=data.country,
            telegram_chat_id=data.telegram_chat_id,
            message=data.message,
            status="pending",
        )

        db.add(req)
        db.commit()
        db.refresh(req)
        return req

    # ---------- Feedback ----------
    @staticmethod
    def create_feedback(db: Session, user, payload):
        feedback = models.UserFeedback(
            user_id=user.id,
            feedback_type=payload.feedback_type,
            title=payload.title,
            description=payload.description,
            status="pending",
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        return feedback

    @staticmethod
    def list_my_feedback(db: Session, user):
        return (
            db.query(models.UserFeedback)
            .filter(models.UserFeedback.user_id == user.id)
            .order_by(models.UserFeedback.created_at.desc())
            .limit(50)
            .all()
        )

    @staticmethod
    def list_all_feedback(db: Session):
        return (
            db.query(models.UserFeedback)
            .order_by(models.UserFeedback.created_at.desc())
            .limit(100)
            .all()
        )

    @staticmethod
    def update_feedback(db: Session, feedback_id: int, payload):
        fb = db.query(models.UserFeedback).filter(models.UserFeedback.id == feedback_id).first()
        if not fb:
            raise HTTPException(status_code=404, detail="Feedback not found")

        if payload.status is not None:
            fb.status = payload.status
        if payload.admin_notes is not None:
            fb.admin_notes = payload.admin_notes

        db.commit()
        db.refresh(fb)
        return fb

    @staticmethod
    def delete_feedback(db: Session, feedback_id: int):
        fb = db.query(models.UserFeedback).filter(models.UserFeedback.id == feedback_id).first()
        if not fb:
            raise HTTPException(status_code=404, detail="Feedback not found")

        db.delete(fb)
        db.commit()


feedback_service = FeedbackService()
