# services/auth_service.py
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from config import config as settings
from models.user import User
from security.hashing import get_password_hash, verify_password
from security.jwt_utils import create_access_token
from schemas import user_schemas



class AuthService:

    # -----------------------
    # TOKEN → USER
    # -----------------------
    @staticmethod
    def get_user_from_token(token: str, db: Session):
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            email: str = payload.get("sub")
            if email is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"}
                )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Update last activity timestamp
        user.last_activity = datetime.utcnow()
        db.add(user)
        db.commit()
        return user

    # -----------------------
    # SIGNUP
    # -----------------------
    @staticmethod
    def signup(user_data: user_schemas.UserCreate, db: Session):
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed = get_password_hash(user_data.password)

        user = User(
            email=user_data.email,
            hashed_password=hashed,
            full_name=user_data.full_name,
            role="user",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    # -----------------------
    # LOGIN
    # -----------------------
    @staticmethod
    def login(form_data, db: Session):
        username = form_data.username.strip()

        # Find by email, userid, or phone number
        user = (
            db.query(User)
            .filter(
                (User.email == username) |
                (User.userid == username) |
                (User.phone_number == username)
            )
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Update activity
        user.last_activity = datetime.utcnow()
        db.commit()

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token = create_access_token(
            data={"sub": user.email},
            expires_delta=access_token_expires
        )
        return {"access_token": token, "token_type": "bearer", "role": user.role}

    # -----------------------
    # LOGOUT
    # -----------------------
    @staticmethod
    def logout(current_user: User, db: Session):
        current_user.last_activity = datetime.utcnow() - timedelta(hours=1)
        db.commit()
        return {"message": "Logged out successfully"}

    # -----------------------
    # ADMIN CHECK
    # -----------------------
    @staticmethod
    def require_admin(current_user: User):
        if current_user.role not in {"admin", settings.SUPERADMIN_ROLE}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        return current_user

    # -----------------------
    # INTERNAL: GET USER BY ID
    # -----------------------
    @staticmethod
    def get_user_by_id(db: Session, user_id: int):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user


auth_service = AuthService()
