from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from models.user import User
from models.change_request import ChangeRequest


def create_change_request(
    db: Session,
    user: User,
    request_type: str,
    status: str = "completed",
    details: Optional[str] = None,
) -> ChangeRequest:
    """
    Persist a change request audit entry for the given user.
    """
    resolved_at = datetime.utcnow() if status == "completed" else None
    entry = ChangeRequest(
        user_id=user.id,
        request_type=request_type,
        status=status,
        details=details,
        created_at=datetime.utcnow(),
        resolved_at=resolved_at,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

