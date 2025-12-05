from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.pending_user_request import PendingUserRequest
from models.user import User
from core import user_utils
from security.hashing import get_password_hash


class PendingRequestService:

    def list_pending_users(self, db: Session, status: str):
        q = db.query(PendingUserRequest)
        if status:
            q = q.filter(PendingUserRequest.status == status)
        return q.order_by(PendingUserRequest.created_at.desc()).all()

    def get_pending_user(self, db: Session, id: int):
        req = db.query(PendingUserRequest).filter(PendingUserRequest.id == id).first()
        if not req:
            raise HTTPException(404, "Pending user request not found")
        return req

    def approve_pending_user(self, db: Session, id: int, password: str):
        req = self.get_pending_user(db, id)

        if req.status != "pending":
            raise HTTPException(400, f"Request is already {req.status}")

        if req.email:
            if db.query(User).filter(User.email == req.email).first():
                raise HTTPException(400, "Email already exists")

        if not user_utils.check_userid_unique(db, req.userid):
            req.userid = user_utils.generate_unique_userid(
                db, req.full_name, req.phone_number
            )

        hashed_pw = get_password_hash(password)
        email = req.email or f"{req.userid}@rubikview.local"

        new_user = User(
            userid=req.userid,
            email=email,
            hashed_password=hashed_pw,
            full_name=req.full_name,
            role="user",
            phone_number=req.phone_number,
            age=req.age,
            address_line1=req.address_line1,
            address_line2=req.address_line2,
            city=req.city,
            state=req.state,
            postal_code=req.postal_code,
            country=req.country,
            telegram_chat_id=req.telegram_chat_id,
            is_active=False,
        )

        db.add(new_user)

        req.status = "approved"
        req.user = new_user

        db.commit()
        db.refresh(new_user)

        return new_user

    def reject_pending_user(self, db: Session, id: int):
        req = self.get_pending_user(db, id)
        req.status = "rejected"
        db.commit()
        db.refresh(req)
        return req


pending_request_service = PendingRequestService()
