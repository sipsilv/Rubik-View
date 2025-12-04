from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from datetime import datetime

from db.session import get_db
from api.dependencies.auth import get_current_user, require_admin
from services import auth_service, profile_service, otp_service, admin_service, feedback_service
import schemas
import models

router = APIRouter()


# ----------------- AUTH -----------------

@router.post("/signup", response_model=schemas.User)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return auth_service.signup(user, db)


@router.post("/logout")
async def logout(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return auth_service.logout(current_user, db)


@router.post("/token", response_model=schemas.Token)
def login(form_data=Depends(), db: Session = Depends(get_db)):
    return auth_service.login(form_data, db)


@router.get("/users/me", response_model=schemas.UserDetail)
async def me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ----------------- PROFILE -----------------

@router.get("/users/me/profile", response_model=schemas.UserDetail)
async def read_profile(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/users/me/profile", response_model=schemas.UserDetail)
async def update_profile(
    payload: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return profile_service.update_profile(db, current_user, payload)


@router.post("/users/me/password", response_model=schemas.UserDetail)
async def update_password(
    payload: schemas.UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return profile_service.update_password(db, current_user, payload)


# ----------------- OTP -----------------

@router.post("/otp/request")
async def request_otp(
    payload: schemas.OTPRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return otp_service.request_otp(db, current_user, payload)


# ----------------- ADMIN USER MGMT -----------------

@router.get("/users", response_model=List[schemas.UserDetail])
async def list_users(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.list_users(db)


@router.post("/users", response_model=schemas.UserDetail, status_code=status.HTTP_201_CREATED)
async def admin_create_user(
    user: schemas.AdminUserCreate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.create_user(db, user)


@router.put("/users/{user_id}", response_model=schemas.UserDetail)
async def admin_update_user(
    user_id: int,
    payload: schemas.AdminUserUpdate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.update_user(db, user_id, payload)


@router.post("/users/{user_id}/notify")
async def admin_notify_user(
    user_id: int,
    payload: schemas.SendCredentialsRequest,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.notify_user(db, user_id, payload)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_user(
    user_id: int,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.delete_user(db, user_id)


# ----------------- FEEDBACK -----------------

@router.post("/contact-admin", response_model=schemas.PendingUserRequestResponse)
async def contact_admin(request: schemas.ContactAdminRequest, db: Session = Depends(get_db)):
    return feedback_service.create_pending_request(db, request)


@router.post("/feedback", response_model=schemas.UserFeedbackResponse)
async def create_feedback(
    payload: schemas.UserFeedbackCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return feedback_service.create_feedback(db, current_user, payload)


@router.get("/feedback", response_model=List[schemas.UserFeedbackResponse])
async def list_my_feedback(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return feedback_service.list_my_feedback(db, current_user)


@router.get("/feedback/all", response_model=List[schemas.UserFeedbackResponse])
async def list_all_feedback(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return feedback_service.list_all_feedback(db)


@router.put("/feedback/{feedback_id}", response_model=schemas.UserFeedbackResponse)
async def update_feedback(
    feedback_id: int,
    payload: schemas.UserFeedbackUpdate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return feedback_service.update_feedback(db, feedback_id, payload)


@router.delete("/feedback/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feedback(
    feedback_id: int,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return feedback_service.delete_feedback(db, feedback_id)

