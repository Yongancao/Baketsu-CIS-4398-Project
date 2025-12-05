from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from io import BytesIO

from core.security import get_current_user
from core.database import get_db
from models import User, UserFile
from services.s3_client import upload_file_to_s3, delete_file_from_s3

router = APIRouter()

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