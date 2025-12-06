from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from io import BytesIO

from core.security import get_current_user
from core.database import get_db
from models import User, UserFile
from schemas.file_schemas import FileDetailResponse, FileListItem
from services.s3_client import upload_file_to_s3, delete_file_from_s3, generate_presigned_url
from datetime import datetime

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