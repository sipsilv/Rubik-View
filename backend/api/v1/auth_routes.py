from fastapi import APIRouter, Depends , status
from typing import List
from sqlalchemy.orm import Session

from db.session import get_db
from api.dependencies.auth import get_current_user, require_admin

from schemas import user_schemas, pending_request_schemas, otp_schemas, auth_schemas, feedback_schemas, user_update_schemas, login_credential_schemas

from models.user import User

from services.auth_service import auth_service
from services.profile_service import profile_service
from services.otp_service import otp_service
from services.admin_service import admin_service

router = APIRouter()


# ----------------- AUTH -----------------

@router.post("/signup", response_model=user_schemas.User)
def signup(user: user_schemas.UserCreate, db: Session = Depends(get_db)):
    return auth_service.signup(user, db)


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return auth_service.logout(current_user, db)


@router.post("/token", response_model=auth_schemas.Token)
def login(form_data=Depends(), db: Session = Depends(get_db)):
    return auth_service.login(form_data, db)


@router.get("/users/me", response_model=user_schemas.UserDetail)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


# ----------------- PROFILE -----------------

@router.get("/users/me/profile", response_model=user_schemas.UserDetail)
async def read_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/users/me/profile", response_model=user_schemas.UserDetail)
async def update_profile(
    payload: user_update_schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_service.update_profile(db, current_user, payload)


@router.post("/users/me/password", response_model=user_schemas.UserDetail)
async def update_password(
    payload: user_update_schemas.UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_service.update_password(db, current_user, payload)


# ----------------- OTP -----------------

@router.post("/otp/request")
async def request_otp(
    payload: otp_schemas.OTPRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return otp_service.request_otp(db, current_user, payload)


# ----------------- ADMIN USER MGMT -----------------

@router.get("/users", response_model=List[user_schemas.UserDetail])
async def list_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.list_users(db)


@router.post("/users", response_model=user_schemas.UserDetail, status_code=status.HTTP_201_CREATED)
async def admin_create_user(
    user: user_schemas.AdminUserCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.create_user(db, user)


@router.put("/users/{user_id}", response_model=user_schemas.UserDetail)
async def admin_update_user(
    user_id: int,
    payload: user_update_schemas.AdminUserUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.update_user(db, user_id, payload)


@router.post("/users/{user_id}/notify")
async def admin_notify_user(
    user_id: int,
    payload: login_credential_schemas.SendCredentialsRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.notify_user(db, user_id, payload)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_user(
    user_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.delete_user(db, user_id)
