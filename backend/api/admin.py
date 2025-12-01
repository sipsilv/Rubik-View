import os
import io
from pathlib import Path
from typing import List

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Response, status, UploadFile, File
from sqlalchemy.orm import Session

from .. import schemas
from ..core import jobs, models
from .auth import get_db, require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/jobs", response_model=List[schemas.AdminJob])
async def list_jobs(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = 15,
):
    return (
        db.query(models.AdminJob)
        .order_by(models.AdminJob.started_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/jobs/{job_type}", response_model=schemas.AdminJob, status_code=status.HTTP_201_CREATED)
async def trigger_job(
    job_type: schemas.JobType,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return jobs.start_job(db, job_type)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.post("/jobs/{job_id}/stop", response_model=schemas.AdminJob)
async def stop_job(
    job_id: int,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return jobs.stop_job(db, job_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/jobs/{job_id}", response_model=schemas.AdminJob)
async def get_job(
    job_id: int,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    job = db.query(models.AdminJob).filter(models.AdminJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/jobs/{job_id}/log")
async def get_job_log(
    job_id: int,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    job = db.query(models.AdminJob).filter(models.AdminJob.id == job_id).first()
    if not job or not job.log_path:
        raise HTTPException(status_code=404, detail="Log not available")
    if not os.path.exists(job.log_path):
        raise HTTPException(status_code=404, detail="Log file missing")
    try:
        with open(job.log_path, "r", encoding="utf-8", errors="ignore") as handler:
            content = handler.read()
    except OSError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return Response(content, media_type="text/plain")


@router.get("/ohlcv/status", response_model=schemas.OHCLVStatus)
async def get_ohlcv_status(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Summarise the most recent OHCLV load job using its log file.
    """
    job = (
        db.query(models.AdminJob)
        .filter(models.AdminJob.job_type == "ohlcv_load")
        .order_by(models.AdminJob.started_at.desc())
        .first()
    )

    # Default: no job yet
    if not job:
        return schemas.OHCLVStatus(status="idle")

    total = 0
    processed = 0
    success = failed = skipped = uptodate = 0
    last_symbol = None
    last_message = None

    if job.log_path and os.path.exists(job.log_path):
        try:
            with open(job.log_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    # Progress lines look like: "12/100 (12.0%): SYMBOL → status"
                    if "→" in line and "/" in line:
                        last_message = line
                        try:
                            left, right = line.split(":", 1)
                            count_part = left.split()[0]  # "12/100"
                            idx_str, total_str = count_part.split("/")
                            processed = max(processed, int(idx_str))
                            total = max(total, int(total_str))
                            # Right side: " SYMBOL → status"
                            if "→" in right:
                                sym_part, status_part = right.split("→", 1)
                                last_symbol = sym_part.strip()
                                status_text = status_part.strip().lower()
                                if "failed" in status_text or "error" in status_text:
                                    failed += 1
                                elif "up-to-date" in status_text or "uptodate" in status_text:
                                    uptodate += 1
                                elif "skipped" in status_text:
                                    skipped += 1
                                elif status_text.startswith("+") or "rows" in status_text:
                                    success += 1
                        except Exception:
                            # Ignore malformed lines
                            continue
        except OSError as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    percent = 0.0
    if total > 0 and processed > 0:
        percent = round(processed / total * 100, 2)

    return schemas.OHCLVStatus(
        job_id=job.id,
        status=job.status,
        started_at=job.started_at,
        finished_at=job.finished_at,
        total_symbols=total,
        processed_symbols=processed,
        success=success,
        failed=failed,
        skipped=skipped,
        uptodate=uptodate,
        last_symbol=last_symbol,
        last_message=last_message,
        percent_complete=percent,
    )


@router.get("/signals/status", response_model=schemas.SignalStatus)
async def get_signal_status(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Summarise the most recent signal processing job using its log file.
    """
    job = (
        db.query(models.AdminJob)
        .filter(models.AdminJob.job_type == "signal_process")
        .order_by(models.AdminJob.started_at.desc())
        .first()
    )

    if not job:
        return schemas.SignalStatus(status="idle")

    total = 0
    done = 0
    processed = uptodate = skipped = errors = 0
    last_symbol = None
    last_message = None

    if job.log_path and os.path.exists(job.log_path):
        try:
            with open(job.log_path, "r", encoding="utf-8", errors="ignore") as f:
                for raw in f:
                    line = raw.strip()
                    # Lines look like: "[12/500] SYMBOL | processed"
                    if line.startswith("[") and "]" in line and "|" in line:
                        last_message = line
                        try:
                            count_part = line[1 : line.index("]")]
                            idx_str, total_str = count_part.split("/", 1)
                            done = max(done, int(idx_str))
                            total = max(total, int(total_str))

                            rest = line[line.index("]") + 1 :].strip()
                            if "|" in rest:
                                sym_part, status_part = rest.split("|", 1)
                                last_symbol = sym_part.strip()
                                status_text = status_part.strip().lower()
                                if "processed" in status_text:
                                    processed += 1
                                elif "up-to-date" in status_text or "up-to-date" in status_text:
                                    uptodate += 1
                                elif "skipped" in status_text:
                                    skipped += 1
                                elif "error" in status_text or "failed" in status_text:
                                    errors += 1
                        except Exception:
                            continue
        except OSError as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    percent = 0.0
    if total > 0 and done > 0:
        percent = round(done / total * 100, 2)

    return schemas.SignalStatus(
        job_id=job.id,
        status=job.status,
        started_at=job.started_at,
        finished_at=job.finished_at,
        total_symbols=total,
        processed_symbols=done,
        processed=processed,
        uptodate=uptodate,
        skipped=skipped,
        errors=errors,
        last_symbol=last_symbol,
        last_message=last_message,
        percent_complete=percent,
    )


@router.get("/indicators", response_model=List[schemas.IndicatorConfig])
async def list_indicators(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.IndicatorConfig).order_by(models.IndicatorConfig.id).all()


@router.post("/indicators", response_model=schemas.IndicatorConfig, status_code=status.HTTP_201_CREATED)
async def create_indicator(
    payload: schemas.IndicatorConfigCreate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ind = models.IndicatorConfig(
        indicator_name=payload.indicator_name,
        description=payload.description,
        active=payload.active,
        parameter_1=payload.parameter_1,
        parameter_2=payload.parameter_2,
        parameter_3=payload.parameter_3,
        manual_weight=str(payload.manual_weight) if payload.manual_weight is not None else None,
        use_ai_weight=payload.use_ai_weight,
        ai_latest_weight=str(payload.ai_latest_weight) if payload.ai_latest_weight is not None else None,
    )
    db.add(ind)
    db.commit()
    db.refresh(ind)
    return ind


@router.put("/indicators/{indicator_id}", response_model=schemas.IndicatorConfig)
async def update_indicator(
    indicator_id: int,
    payload: schemas.IndicatorConfigUpdate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ind = db.query(models.IndicatorConfig).filter(models.IndicatorConfig.id == indicator_id).first()
    if not ind:
        raise HTTPException(status_code=404, detail="Indicator not found")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if field in {"manual_weight", "ai_latest_weight"} and value is not None:
            setattr(ind, field, str(value))
        else:
            setattr(ind, field, value)

    db.add(ind)
    db.commit()
    db.refresh(ind)
    return ind


@router.delete("/indicators/{indicator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_indicator(
    indicator_id: int,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ind = db.query(models.IndicatorConfig).filter(models.IndicatorConfig.id == indicator_id).first()
    if not ind:
        raise HTTPException(status_code=404, detail="Indicator not found")
    db.delete(ind)
    db.commit()


@router.get("/indicators/template")
async def download_indicator_template(
    _: models.User = Depends(require_admin),
):
    """
    Download a CSV template for indicator uploads.

    Columns:
      indicator_name,description,active,parameter_1,parameter_2,parameter_3,manual_weight,use_ai_weight,ai_latest_weight
    """
    csv_lines = [
        "indicator_name,description,active,parameter_1,parameter_2,parameter_3,manual_weight,use_ai_weight,ai_latest_weight",
        "RSI,Relative Strength Index,Y,14,,,1.0,N,",
        "MACD,Moving Average Convergence Divergence,Y,12,26,9,1.0,N,",
    ]
    content = "\n".join(csv_lines) + "\n"
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="indicator_template.csv"'},
    )


@router.post("/indicators/upload")
async def upload_indicators(
    file: UploadFile = File(...),
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Bulk upload indicators from a CSV/Excel file.

    Expected columns (case-insensitive, spaces/underscores ignored):
      - indicator_name (required)
      - description
      - active (Y/N, TRUE/FALSE, 1/0)
      - parameter_1
      - parameter_2
      - parameter_3
      - manual_weight
      - use_ai_weight (Y/N, TRUE/FALSE, 1/0)
      - ai_latest_weight
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    suffix = Path(file.filename).suffix.lower()
    raw = await file.read()

    try:
        buffer = io.BytesIO(raw)
        if suffix == ".csv":
            df = pd.read_csv(buffer)
        elif suffix in {".xlsx", ".xls"}:
            df = pd.read_excel(buffer)
        else:
            raise HTTPException(status_code=400, detail="Only .csv, .xlsx or .xls files are supported")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read file: {exc}")

    if df.empty:
        return {"created": 0, "updated": 0, "total": 0}

    # Normalise column names
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

    def _as_bool(val):
        if pd.isna(val):
            return False
        if isinstance(val, (int, float)):
            return bool(val)
        s = str(val).strip().lower()
        return s in {"y", "yes", "true", "1"}

    created = 0
    updated = 0

    for _, row in df.iterrows():
        name = row.get("indicator_name")
        if not name or str(name).strip() == "":
            continue

        name = str(name).strip()

        ind = (
            db.query(models.IndicatorConfig)
            .filter(models.IndicatorConfig.indicator_name == name)
            .first()
        )

        data = {
            "indicator_name": name,
            "description": row.get("description"),
            "active": _as_bool(row.get("active")),
            "parameter_1": pd.to_numeric(row.get("parameter_1"), errors="coerce"),
            "parameter_2": pd.to_numeric(row.get("parameter_2"), errors="coerce"),
            "parameter_3": pd.to_numeric(row.get("parameter_3"), errors="coerce"),
            "manual_weight": pd.to_numeric(row.get("manual_weight"), errors="coerce"),
            "use_ai_weight": _as_bool(row.get("use_ai_weight")),
            "ai_latest_weight": pd.to_numeric(row.get("ai_latest_weight"), errors="coerce"),
        }

        if ind:
            # update existing indicator
            ind.description = data["description"]
            ind.active = data["active"]
            ind.parameter_1 = data["parameter_1"]
            ind.parameter_2 = data["parameter_2"]
            ind.parameter_3 = data["parameter_3"]
            ind.manual_weight = (
                str(data["manual_weight"]) if data["manual_weight"] is not None else None
            )
            ind.use_ai_weight = data["use_ai_weight"]
            ind.ai_latest_weight = (
                str(data["ai_latest_weight"]) if data["ai_latest_weight"] is not None else None
            )
            updated += 1
        else:
            # create new
            ind = models.IndicatorConfig(
                indicator_name=data["indicator_name"],
                description=data["description"],
                active=data["active"],
                parameter_1=data["parameter_1"],
                parameter_2=data["parameter_2"],
                parameter_3=data["parameter_3"],
                manual_weight=(
                    str(data["manual_weight"]) if data["manual_weight"] is not None else None
                ),
                use_ai_weight=data["use_ai_weight"],
                ai_latest_weight=(
                    str(data["ai_latest_weight"]) if data["ai_latest_weight"] is not None else None
                ),
            )
            db.add(ind)
            created += 1

    db.commit()

    return {"created": created, "updated": updated, "total": created + updated}

