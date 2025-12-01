from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import schemas
from ..core import change_requests, database, models, notifications, otp, security
from ..core.config import settings

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.jwt.decode(token, security.settings.SECRET_KEY, algorithms=[security.settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except security.JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role not in {"admin", settings.SUPERADMIN_ROLE}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

def _get_user_by_id(db: Session, user_id: int) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def _ensure_can_issue_otp(db: Session, user: models.User, purpose: str):
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
        raise HTTPException(status_code=429, detail="OTP already sent. Please wait before requesting again.")

def _apply_profile_updates(user: models.User, payload):
    user.full_name = payload.full_name if payload.full_name is not None else user.full_name
    user.phone_number = payload.phone_number if payload.phone_number is not None else user.phone_number
    user.age = payload.age if payload.age is not None else user.age
    user.address_line1 = payload.address_line1 if payload.address_line1 is not None else user.address_line1
    user.address_line2 = payload.address_line2 if payload.address_line2 is not None else user.address_line2
    user.city = payload.city if payload.city is not None else user.city
    user.state = payload.state if payload.state is not None else user.state
    user.postal_code = payload.postal_code if payload.postal_code is not None else user.postal_code
    user.country = payload.country if payload.country is not None else user.country
    user.telegram_chat_id = payload.telegram_chat_id if payload.telegram_chat_id is not None else user.telegram_chat_id

@router.post("/signup", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        role="user",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@router.get("/users/me", response_model=schemas.UserDetail)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.get("/users/me/profile", response_model=schemas.UserDetail)
async def read_profile(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/users/me/profile", response_model=schemas.UserDetail)
async def update_profile(
    payload: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not otp.verify_otp(db, current_user, "PROFILE_UPDATE", payload.otp_code):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    _apply_profile_updates(current_user, payload)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    changes = [
        field
        for field in payload.model_dump(exclude_unset=True).keys()
        if field != "otp_code"
    ]
    details = f"Updated fields: {', '.join(changes)}" if changes else "Profile updated."
    change_requests.create_change_request(
        db,
        current_user,
        request_type="PROFILE_UPDATE",
        status="completed",
        details=details,
    )

    notifications.send_telegram_message(
        current_user.telegram_chat_id,
        f"Profile updated for {current_user.email} at {datetime.utcnow().isoformat()}",
    )
    return current_user

@router.post("/users/me/password", response_model=schemas.UserDetail)
async def update_password(
    payload: schemas.UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not otp.verify_otp(db, current_user, "PASSWORD_CHANGE", payload.otp_code):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    current_user.hashed_password = security.get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    change_requests.create_change_request(
        db,
        current_user,
        request_type="PASSWORD_CHANGE",
        status="completed",
        details="Password updated",
    )

    notifications.send_telegram_message(
        current_user.telegram_chat_id,
        f"Password updated for {current_user.email} at {datetime.utcnow().isoformat()}",
    )
    return current_user

@router.post("/otp/request")
async def request_otp(
    payload: schemas.OTPRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _ensure_can_issue_otp(db, current_user, payload.purpose)
    otp_obj, code = otp.create_otp(db, current_user, payload.purpose)

    delivered = notifications.send_telegram_message(
        current_user.telegram_chat_id,
        f"Your OTP for {payload.purpose.replace('_', ' ').title()} is {code}. Expires at {otp_obj.expires_at} UTC",
    )
    response = {"message": "OTP generated", "delivered": delivered}
    if not delivered:
        response["debug_code"] = code
    return response

@router.get("/users", response_model=List[schemas.UserDetail])
async def list_users(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.User).order_by(models.User.id).all()


@router.get("/users/me/change-requests", response_model=List[schemas.ChangeRequest])
async def list_my_change_requests(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.ChangeRequest)
        .filter(models.ChangeRequest.user_id == current_user.id)
        .order_by(models.ChangeRequest.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/change-requests", response_model=List[schemas.ChangeRequest])
async def list_change_requests(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.ChangeRequest)
        .order_by(models.ChangeRequest.created_at.desc())
        .limit(100)
        .all()
    )

@router.post("/users", response_model=schemas.UserDetail, status_code=status.HTTP_201_CREATED)
async def admin_create_user(
    user: schemas.AdminUserCreate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        role=user.role,
        phone_number=user.phone_number,
        age=user.age,
        address_line1=user.address_line1,
        address_line2=user.address_line2,
        city=user.city,
        state=user.state,
        postal_code=user.postal_code,
        country=user.country,
        telegram_chat_id=user.telegram_chat_id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/users/{user_id}", response_model=schemas.UserDetail)
async def admin_update_user(
    user_id: int,
    payload: schemas.AdminUserUpdate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = _get_user_by_id(db, user_id)

    _apply_profile_updates(user, payload)
    if payload.role:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password:
        user.hashed_password = security.get_password_hash(payload.password)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/users/{user_id}/notify")
async def admin_notify_user(
    user_id: int,
    payload: schemas.SendCredentialsRequest,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = _get_user_by_id(db, user_id)
    sent = notifications.send_telegram_message(user.telegram_chat_id, payload.message)
    return {"delivered": sent}

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = _get_user_by_id(db, user_id)

    if user.email == settings.SUPERADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Cannot delete super admin account")

    db.delete(user)
    db.commit()
