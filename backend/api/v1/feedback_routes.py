from fastapi import APIRouter, Depends , status
from typing import List
from sqlalchemy.orm import Session

from db.session import get_db
from api.dependencies.auth import get_current_user, require_admin

from schemas import pending_request_schemas, feedback_schemas

from models.user import User

from services.feedback_service import feedback_service


router = APIRouter()
# ----------------- FEEDBACK -----------------

@router.post("/contact-admin", response_model=pending_request_schemas.PendingUserRequestResponse)
async def contact_admin(request: pending_request_schemas.ContactAdminRequest, db: Session = Depends(get_db)):
    return feedback_service.create_pending_request(db, request)


@router.post("/feedback", response_model=feedback_schemas.UserFeedbackResponse)
async def create_feedback(
    payload: feedback_schemas.UserFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return feedback_service.create_feedback(db, current_user, payload)


@router.get("/feedback", response_model=List[feedback_schemas.UserFeedbackResponse])
async def list_my_feedback(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return feedback_service.list_my_feedback(db, current_user)


@router.get("/feedback/all", response_model=List[feedback_schemas.UserFeedbackResponse])
async def list_all_feedback(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return feedback_service.list_all_feedback(db)


@router.put("/feedback/{feedback_id}", response_model=feedback_schemas.UserFeedbackResponse)
async def update_feedback(
    feedback_id: int,
    payload: feedback_schemas.UserFeedbackUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return feedback_service.update_feedback(db, feedback_id, payload)


@router.delete("/feedback/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feedback(
    feedback_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return feedback_service.delete_feedback(db, feedback_id)