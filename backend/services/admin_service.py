# services/admin_service.py
from fastapi import HTTPException
from sqlalchemy.orm import Session

from core import models, security, user_utils, notifications
from core.config import settings
from services.auth_service import auth_service


class AdminService:

    @staticmethod
    def list_users(db: Session):
        return db.query(models.User).order_by(models.User.id).all()

    @staticmethod
    def create_user(db: Session, data):
        # Check existing email
        if db.query(models.User).filter(models.User.email == data.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")

        # Generate userid if needed
        userid = user_utils.generate_unique_userid(db, data.full_name, data.phone_number)

        user = models.User(
            userid=userid,
            email=data.email,
            hashed_password=security.get_password_hash(data.password),
            full_name=data.full_name,
            role=data.role,
            phone_number=data.phone_number,
            age=data.age,
            address_line1=data.address_line1,
            address_line2=data.address_line2,
            city=data.city,
            state=data.state,
            postal_code=data.postal_code,
            country=data.country,
            telegram_chat_id=data.telegram_chat_id,
        )

        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_user(db: Session, user_id: int, payload):
        user = auth_service.get_user_by_id(db, user_id)

        # Unique userid check
        if payload.userid and payload.userid != user.userid:
            if not user_utils.check_userid_unique(db, payload.userid, exclude_user_id=user.id):
                raise HTTPException(status_code=400, detail="UserID already exists")
            user.userid = payload.userid

        # Profile updates
        for k, v in payload.model_dump(exclude_unset=True).items():
            if k in ["role", "is_active", "password"]:
                continue
            setattr(user, k, v)

        if payload.role:
            user.role = payload.role
        if payload.is_active is not None:
            user.is_active = payload.is_active
        if payload.password:
            user.hashed_password = security.get_password_hash(payload.password)

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def notify_user(db: Session, user_id: int, payload):
        user = auth_service.get_user_by_id(db, user_id)
        delivered = notifications.send_telegram_message(user.telegram_chat_id, payload.message)
        return {"delivered": delivered}

    @staticmethod
    def delete_user(db: Session, user_id: int):
        user = auth_service.get_user_by_id(db, user_id)

        if user.email == settings.SUPERADMIN_EMAIL:
            raise HTTPException(status_code=400, detail="Cannot delete superadmin")

        db.delete(user)
        db.commit()


admin_service = AdminService()
