from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from db.session import get_db
from services.auth_service import auth_service
from models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")


# -------------------------------------------------
# GET CURRENT USER FROM TOKEN (Uses AuthService)
# -------------------------------------------------
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Uses AuthService to decode JWT and fetch user.
    """
    return auth_service.get_user_from_token(token, db)


# -------------------------------------------------
# REQUIRE ADMIN ROLE
# -------------------------------------------------
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Ensures current user is admin or superadmin.
    """
    return auth_service.require_admin(current_user)
