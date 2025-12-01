from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from . import models


def create_change_request(
    db: Session,
    user: models.User,
    request_type: str,
    status: str = "completed",
    details: Optional[str] = None,
) -> models.ChangeRequest:
    """
    Persist a change request audit entry for the given user.
    """
    resolved_at = datetime.utcnow() if status == "completed" else None
    entry = models.ChangeRequest(
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

