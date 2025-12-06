from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from io import BytesIO

from core.security import get_current_user
from core.database import get_db
from models import User, UserFile
from schemas.file_schemas import FileDetailResponse, FileListItem
from services.s3_client import upload_file_to_s3, delete_file_from_s3, generate_presigned_url
from datetime import datetime, timedelta

router = APIRouter(prefix="/files", tags=["Files"])

@router.post("/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    uploaded = []

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    for file in files:
        filename = file.filename
        key = f"users/{current_user.id}/{filename}"

        # ✅ Read file into memory
        file_bytes = await file.read()
        buffer = BytesIO(file_bytes)

        # Reject empty files
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail=f"File {filename} is empty")

        # ✅ Upload to S3
        upload_file_to_s3(buffer, key)

        # ✅ Save metadata
        db_file = UserFile(
            user_id=current_user.id,
            filename=filename,
            file_key=key,
            file_size=len(file_bytes)
        )
        db.add(db_file)
        db.commit()
        db.refresh(db_file)

        uploaded.append({
            "file_id": db_file.id,
            "filename": filename
        })

    return {"message": "Files uploaded successfully", "uploaded": uploaded}

@router.get("/billing")
async def get_billing(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    MONTHLY_RATE = 0.023  # cost per GB per month
    now = datetime.utcnow()

    def safe_date(value):
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, str):
            try:
                return datetime.strptime(value, "%Y-%m-%d %H:%M:%S").date()
            except:
                try:
                    return datetime.fromisoformat(value).date()
                except:
                    return None
        return None

    billing_start = datetime(now.year, now.month, 1).date()

    if now.month == 12:
        next_month = datetime(now.year + 1, 1, 1)
    else:
        next_month = datetime(now.year, now.month + 1, 1)

    billing_end = (next_month - timedelta(seconds=1)).date()
    month_days = (billing_end - billing_start).days + 1
    DAILY_RATE = MONTHLY_RATE / month_days

    files = db.query(UserFile).filter(
        UserFile.user_id == current_user.id
    ).all()

    actual_cost = 0
    estimated_cost = 0

    for f in files:
        file_upload_day = safe_date(f.uploaded_at)
        deletion_day = safe_date(f.deleted_at)

        if not file_upload_day:
            continue  # skip any corrupted rows

        # Actual cost this month
        actual_start = max(file_upload_day, billing_start)
        actual_end = min(deletion_day or now.date(), now.date())
        chargeable_days_actual = (actual_end - actual_start).days + 1
        if chargeable_days_actual < 1:
            chargeable_days_actual = 0

        gb_size = f.file_size / (1024**3)
        actual_cost += gb_size * DAILY_RATE * chargeable_days_actual

        # Estimated total cost
        est_end = min(deletion_day or billing_end, billing_end)
        chargeable_days_est = (est_end - actual_start).days + 1
        if chargeable_days_est < 1:
            chargeable_days_est = 0

        estimated_cost += gb_size * DAILY_RATE * chargeable_days_est

    return {
        "daily_rate_per_gb": DAILY_RATE,
        "actual_cost": round(actual_cost, 10),
        "estimated_cost": round(estimated_cost, 10),
        "days_in_month": month_days,
    }

@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    file_record = db.query(UserFile).filter(UserFile.user_id == current_user.id, UserFile.id == file_id).first()

    if not file_record: 
        raise HTTPException(status_code=404, detail="File not found")
    
    delete_file_from_s3(file_record.file_key)

    file_record.deleted_at = datetime.utcnow()
    db.commit()

    return {"message": "File deleted successfully"}

@router.get("/list", response_model=List[FileListItem])
async def list_files(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Get all files for this user
    files = (
        db.query(UserFile)
        .filter(UserFile.user_id == current_user.id)
        .order_by(UserFile.uploaded_at.desc())
        .all()
    )

    return files

@router.get("/favicon.ico")
async def favicon():
    return {}

@router.get("/{file_id}", response_model=FileDetailResponse)
async def get_file_details(
    file_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    file_record = (
        db.query(UserFile)
        .filter(UserFile.user_id == current_user.id, UserFile.id == file_id)
        .first()
    )

    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    # Generate preview URL
    preview_url = generate_presigned_url(file_record.file_key)

    # Handle uploaded_at (SQLite stores DateTime as string)
    raw_time = file_record.uploaded_at

    if isinstance(raw_time, str):
        # Convert "2025-12-03 17:13:43" -> ISO format
        try:
            dt = datetime.strptime(raw_time, "%Y-%m-%d %H:%M:%S")
            uploaded_at = dt.isoformat()
        except ValueError:
            # If parsing fails, fallback to raw string
            uploaded_at = raw_time

    elif isinstance(raw_time, datetime):
        uploaded_at = raw_time.isoformat()

    else:
        uploaded_at = None

    return {
        "id": file_record.id,
        "filename": file_record.filename,
        "file_size": file_record.file_size,
        "preview_url": preview_url,
        "uploaded_at": uploaded_at,
    }