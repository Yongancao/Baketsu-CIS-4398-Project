from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from typing import List
from sqlalchemy.orm import Session
from io import BytesIO

from core.security import get_current_user
from core.database import get_db
from models import User, UserFile, FileStorageHistory, Folder
from schemas.file_schemas import FileDetailResponse, FileListItem
from services.s3_client import upload_file_to_s3, delete_file_from_s3, generate_presigned_url, generate_download_url, copy_file_in_s3, copy_file_in_s3
from datetime import datetime, timedelta

router = APIRouter(prefix="/files", tags=["Files"])

@router.post("/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    folder_id: int | None = None,
    folder_name: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    uploaded = []

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # If folder_name is provided, create a new folder and use its ID
    if folder_name:
        # Check if folder already exists under root
        existing = db.query(Folder).filter(
            Folder.user_id == current_user.id,
            Folder.parent_id == None,
            Folder.name == folder_name
        ).first()
        
        if existing:
            folder_id = existing.id
        else:
            # Create new folder
            new_folder = Folder(
                name=folder_name,
                user_id=current_user.id,
                parent_id=None
            )
            db.add(new_folder)
            db.commit()
            db.refresh(new_folder)
            folder_id = new_folder.id

    for file in files:
        filename = file.filename
        # Extract just the basename from the filename (in case it contains path separators)
        import os
        filename = os.path.basename(filename)
        
        if folder_id:
            key = f"users/{current_user.id}/folders/{folder_id}/{filename}"
        else:
            key = f"users/{current_user.id}/{filename}"

        # Check if file with same name already exists for this user in the same folder
        existing_file = (
            db.query(UserFile)
            .filter(
                UserFile.user_id == current_user.id,
                UserFile.filename == filename,
                UserFile.folder_id == folder_id,
                UserFile.deleted_at.is_(None)
            )
            .first()
        )
        
        if existing_file:
            raise HTTPException(
                status_code=400,
                detail=f"File '{filename}' already exists in this location. Please rename the file or delete the existing one first."
            )

        # ✅ Read file into memory
        file_bytes = await file.read()
        buffer = BytesIO(file_bytes)

        # Reject empty files
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail=f"File {filename} is empty")

        # ✅ Save metadata to DB first
        db_file = UserFile(
            user_id=current_user.id,
            filename=filename,
            file_key=key,
            file_size=len(file_bytes),
            folder_id=folder_id
        )
        db.add(db_file)
        
        try:
            db.commit()
            db.refresh(db_file)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
        # ✅ Only upload to S3 after successful DB commit
        try:
            upload_file_to_s3(buffer, key)
        except Exception as e:
            # If S3 upload fails, delete the DB record
            db.delete(db_file)
            db.commit()
            raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")

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

    # Get active files
    active_files = db.query(UserFile).filter(
        UserFile.user_id == current_user.id
    ).all()

    # Get historical files (deleted this month)
    historical_files = db.query(FileStorageHistory).filter(
        FileStorageHistory.user_id == current_user.id
    ).all()

    actual_cost = 0
    estimated_cost = 0

    # Calculate for active files
    for f in active_files:
        file_upload_day = safe_date(f.uploaded_at)

        if not file_upload_day:
            continue  # skip any corrupted rows

        # Actual cost this month (from upload or billing start, whichever is later, until now)
        actual_start = max(file_upload_day, billing_start)
        actual_end = now.date()
        chargeable_days_actual = (actual_end - actual_start).days + 1
        if chargeable_days_actual < 1:
            chargeable_days_actual = 0

        gb_size = f.file_size / (1024**3)
        actual_cost += gb_size * DAILY_RATE * chargeable_days_actual

        # Estimated total cost (assumes file stays until end of month)
        est_end = billing_end
        chargeable_days_est = (est_end - actual_start).days + 1
        if chargeable_days_est < 1:
            chargeable_days_est = 0

        estimated_cost += gb_size * DAILY_RATE * chargeable_days_est

    # Calculate for historical (deleted) files this month
    for f in historical_files:
        file_upload_day = safe_date(f.uploaded_at)
        deletion_day = safe_date(f.deleted_at)

        if not file_upload_day or not deletion_day:
            continue

        # Only include if file was active during this billing period
        if deletion_day < billing_start:
            continue  # File was deleted before this month

        # Calculate cost for the period file was stored
        actual_start = max(file_upload_day, billing_start)
        actual_end = min(deletion_day, billing_end)
        chargeable_days = (actual_end - actual_start).days + 1
        if chargeable_days < 1:
            chargeable_days = 0

        gb_size = f.file_size / (1024**3)
        cost = gb_size * DAILY_RATE * chargeable_days
        actual_cost += cost
        estimated_cost += cost  # For deleted files, actual = estimated

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
    
    # Delete from S3
    delete_file_from_s3(file_record.file_key)

    # Move to storage history for billing
    history_record = FileStorageHistory(
        user_id=file_record.user_id,
        filename=file_record.filename,
        file_key=file_record.file_key,
        file_size=file_record.file_size,
        uploaded_at=file_record.uploaded_at,
        deleted_at=datetime.utcnow()
    )
    db.add(history_record)
    
    # Actually delete the file record from main table
    db.delete(file_record)
    db.commit()

    return {"message": "File deleted successfully"}

@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    file_record = db.query(UserFile).filter(
        UserFile.user_id == current_user.id,
        UserFile.id == file_id
    ).first()

    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    # Generate download URL with proper Content-Disposition header
    download_url = generate_download_url(file_record.file_key, file_record.filename)

    return {"download_url": download_url}

@router.get("/list", response_model=List[FileListItem])
async def list_files(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from datetime import timezone
    
    # Get all files for this user (deleted files are removed from this table)
    files = (
        db.query(UserFile)
        .filter(UserFile.user_id == current_user.id)
        .order_by(UserFile.uploaded_at.desc())
        .all()
    )

    # Convert uploaded_at to UTC ISO format for each file
    result = []
    for file in files:
        uploaded_at = file.uploaded_at
        if isinstance(uploaded_at, str):
            try:
                dt = datetime.strptime(uploaded_at, "%Y-%m-%d %H:%M:%S")
                dt_utc = dt.replace(tzinfo=timezone.utc)
                uploaded_at = dt_utc.isoformat()
            except ValueError:
                pass
        elif isinstance(uploaded_at, datetime):
            if uploaded_at.tzinfo is None:
                uploaded_at = uploaded_at.replace(tzinfo=timezone.utc)
            uploaded_at = uploaded_at.isoformat()
        
        result.append({
            "id": file.id,
            "filename": file.filename,
            "file_size": file.file_size,
            "uploaded_at": uploaded_at,
            "preview_url": generate_presigned_url(file.file_key),
            "download_url": generate_download_url(file.file_key, file.filename),
            "folder_id": file.folder_id
        })
    
    return result

@router.patch("/{file_id}/rename")
async def rename_file(
    file_id: int,
    new_filename: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Rename a file without re-uploading.
    Updates the filename in the database and the S3 key.
    """
    if not new_filename or not new_filename.strip():
        raise HTTPException(status_code=400, detail="Filename cannot be empty")
    
    new_filename = new_filename.strip()
    
    # Get the file record
    file_record = (
        db.query(UserFile)
        .filter(UserFile.user_id == current_user.id, UserFile.id == file_id)
        .first()
    )
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if a file with the new name already exists in the same location
    # (excluding the current file being renamed)
    existing_file = (
        db.query(UserFile)
        .filter(
            UserFile.user_id == current_user.id,
            UserFile.filename == new_filename,
            UserFile.folder_id == file_record.folder_id,
            UserFile.deleted_at.is_(None),
            UserFile.id != file_id  # Exclude the current file
        )
        .first()
    )
    
    if existing_file:
        raise HTTPException(
            status_code=400,
            detail=f"File '{new_filename}' already exists in this location. Please choose a different name."
        )
    old_key = file_record.file_key
    
    # Generate new S3 key with the new filename
    if file_record.folder_id:
        new_key = f"users/{current_user.id}/folders/{file_record.folder_id}/{new_filename}"
    else:
        new_key = f"users/{current_user.id}/{new_filename}"
    
    try:
        # Copy object to new key and delete old one
        copy_file_in_s3(old_key, new_key)
        delete_file_from_s3(old_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rename file in S3: {str(e)}")
    
    # Update database record
    file_record.filename = new_filename
    file_record.file_key = new_key
    
    db.commit()
    db.refresh(file_record)
    
    return {
        "id": file_record.id,
        "filename": file_record.filename,
        "file_key": file_record.file_key,
        "message": "File renamed successfully"
    }

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

    # Handle uploaded_at - ensure UTC timezone
    raw_time = file_record.uploaded_at

    if isinstance(raw_time, str):
        # Convert "2025-12-03 17:13:43" -> ISO format with UTC timezone
        try:
            from datetime import timezone
            dt = datetime.strptime(raw_time, "%Y-%m-%d %H:%M:%S")
            # Assume stored time is UTC and make it timezone-aware
            dt_utc = dt.replace(tzinfo=timezone.utc)
            uploaded_at = dt_utc.isoformat()
        except ValueError:
            # If parsing fails, fallback to raw string
            uploaded_at = raw_time

    elif isinstance(raw_time, datetime):
        # Ensure datetime is timezone-aware (UTC)
        from datetime import timezone
        if raw_time.tzinfo is None:
            raw_time = raw_time.replace(tzinfo=timezone.utc)
        uploaded_at = raw_time.isoformat()

    else:
        uploaded_at = None

    return {
        "folder_id": file_record.folder_id,
        "id": file_record.id,
        "filename": file_record.filename,
        "file_size": file_record.file_size,
        "preview_url": preview_url,
        "uploaded_at": uploaded_at,
    }

@router.get("/in-folder/{folder_id}")
def get_files_in_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from datetime import datetime, timezone

    files = db.query(UserFile).filter(
        UserFile.user_id == current_user.id,
        UserFile.folder_id == folder_id
    ).all()

    result = []
    for f in files:

        print("DEBUG FILE KEY:", f.file_key)

        # --- Ensure uploaded_at is ISO formatted like /files/list ---
        uploaded_at = f.uploaded_at
        if isinstance(uploaded_at, str):
            try:
                dt = datetime.strptime(uploaded_at, "%Y-%m-%d %H:%M:%S")
                uploaded_at = dt.replace(tzinfo=timezone.utc).isoformat()
            except:
                pass
        elif isinstance(uploaded_at, datetime):
            if uploaded_at.tzinfo is None:
                uploaded_at = uploaded_at.replace(tzinfo=timezone.utc)
            uploaded_at = uploaded_at.isoformat()
        # ----------------------------------------------------------------

        result.append({
            "id": f.id,
            "filename": f.filename,
            "file_size": f.file_size,
            "uploaded_at": uploaded_at,
            "preview_url": generate_presigned_url(f.file_key),
            "download_url": generate_download_url(f.file_key, f.filename),
            "folder_id": f.folder_id
        })

    return result