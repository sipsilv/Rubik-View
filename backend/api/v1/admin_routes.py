from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.session import get_db
from api.dependencies.auth import require_admin
from schemas.job_schemas import AdminJob, JobType, OHCLVStatus, SignalStatus
from schemas.job_schedule_schemas import JobScheduleResponse, JobScheduleCreate, JobScheduleUpdate
from schemas.indicator_schemas import (
    IndicatorConfig,
    IndicatorConfigCreate,
    IndicatorConfigUpdate,
)
from schemas.pending_request_schemas import PendingUserRequestResponse
from schemas.user_schemas import UserDetail


from services.job_service import job_service
from services.indicator_service import indicator_service
from services.schedule_service import schedule_service
from services.pending_request_service import pending_request_service

router = APIRouter(prefix="/admin", tags=["admin"])

# --------------------
# JOB MANAGEMENT
# --------------------

@router.get("/jobs", response_model=List[AdminJob])
async def list_jobs(
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = 15,
    job_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    triggered_by: Optional[str] = Query(None),
):
    return job_service.list_jobs(db, limit, job_type, status, triggered_by)


@router.post("/jobs/{job_type}", response_model=AdminJob, status_code=201)
async def trigger_job(
    job_type: JobType,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return job_service.trigger_job(db, job_type)


@router.post("/jobs/{job_id}/stop", response_model=AdminJob)
async def stop_job(
    job_id: int,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return job_service.stop_job(db, job_id)


@router.post("/jobs/{job_id}/force-stop", response_model=AdminJob)
async def force_stop_job(
    job_id: int,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return job_service.force_stop_job(db, job_id)


@router.get("/jobs/{job_id}", response_model=AdminJob)
async def get_job(
    job_id: int,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return job_service.get_job(db, job_id)


@router.get("/jobs/{job_id}/log")
async def get_job_log(
    job_id: int,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return job_service.get_job_log(db, job_id)


@router.get("/ohlcv/status", response_model=OHCLVStatus)
async def get_ohlcv_status(
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return job_service.get_ohlcv_status(db)


@router.get("/signals/status", response_model=SignalStatus)
async def get_signal_status(
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return job_service.get_signal_status(db)


# --------------------
# INDICATOR MGMT
# --------------------

@router.get("/indicators", response_model=List[IndicatorConfig])
async def list_indicators(
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return indicator_service.list_indicators(db)


@router.post("/indicators", response_model=IndicatorConfig, status_code=201)
async def create_indicator(
    payload: IndicatorConfigCreate,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return indicator_service.create_indicator(db, payload)


@router.put("/indicators/{indicator_id}", response_model=IndicatorConfig)
async def update_indicator(
    indicator_id: int,
    payload: IndicatorConfigUpdate,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return indicator_service.update_indicator(db, indicator_id, payload)


@router.delete("/indicators/{indicator_id}", status_code=204)
async def delete_indicator(
    indicator_id: int,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return indicator_service.delete_indicator(db, indicator_id)


@router.get("/indicators/template")
async def download_indicator_template(_: str = Depends(require_admin)):
    return indicator_service.indicator_template()


@router.post("/indicators/upload")
async def upload_indicators(
    file: UploadFile = File(...),
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return await indicator_service.upload_indicators(db, file)


# --------------------
# JOB SCHEDULE MGMT
# --------------------

@router.get("/schedules", response_model=List[JobScheduleResponse])
async def list_schedules(
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
    job_type: Optional[str] = Query(None),
):
    return schedule_service.list_schedules(db, job_type)


@router.post("/schedules", response_model=JobScheduleResponse, status_code=201)
async def create_schedule(
    data: JobScheduleCreate,
    current_user: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return schedule_service.create_schedule(db, data, current_user)


@router.put("/schedules/{schedule_id}", response_model=JobScheduleResponse)
async def update_schedule(
    schedule_id: int,
    data: JobScheduleUpdate,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return schedule_service.update_schedule(db, schedule_id, data)


@router.delete("/schedules/{schedule_id}", status_code=204)
async def delete_schedule(
    schedule_id: int,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return schedule_service.delete_schedule(db, schedule_id)


# --------------------
# USER REQUEST (pending signups)
# --------------------

@router.get("/pending-users", response_model=List[PendingUserRequestResponse])
async def list_pending_users(
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
    status: Optional[str] = Query(None),
):
    return pending_request_service.list_pending_users(db, status)


@router.get("/pending-users/{request_id}", response_model=PendingUserRequestResponse)
async def get_pending_user(
    request_id: int,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return pending_request_service.get_pending_user(db, request_id)


class ApprovePendingUserRequest(BaseModel):
    password: str


@router.post("/pending-users/{request_id}/approve", response_model=UserDetail, status_code=201)
async def approve_pending_user(
    request_id: int,
    payload: ApprovePendingUserRequest,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return pending_request_service.approve_pending_user(db, request_id, payload.password)


@router.post("/pending-users/{request_id}/reject", response_model=PendingUserRequestResponse)
async def reject_pending_user(
    request_id: int,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return pending_request_service.reject_pending_user(db, request_id)
