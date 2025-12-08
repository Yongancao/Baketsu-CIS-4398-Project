from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user
from models.folder import Folder
from models.file import UserFile
from pydantic import BaseModel
from services.s3_client import generate_presigned_url, generate_download_url, delete_file_from_s3, s3, BUCKET_NAME
from datetime import datetime, timedelta
from fastapi.responses import StreamingResponse
import io, zipfile

router = APIRouter(prefix="/folders", tags=["Folders"])

@router.post("/create")
def create_folder(
    name: str,
    parent_id: int | None = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # If parent_id is provided, make sure the parent exists and belongs to current user
    if parent_id is not None:
        parent = db.query(Folder).filter(
            Folder.id == parent_id,
            Folder.user_id == current_user.id
        ).first()
        if not parent:
            raise HTTPException(400, "Parent folder does not exist")

    # Check duplicate under the same parent
    existing = db.query(Folder).filter(
        Folder.user_id == current_user.id,
        Folder.parent_id == parent_id,
        Folder.name == name
    ).first()

    if existing:
        raise HTTPException(400, "Folder already exists under this parent")

    # Create the folder
    folder = Folder(
        name=name,
        user_id=current_user.id,
        parent_id=parent_id  # None for root folders
    )

    db.add(folder)
    db.commit()
    db.refresh(folder)

    return folder

@router.get("/list")
def list_folders(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    folders = db.query(Folder).filter(Folder.user_id == current_user.id).all()
    return folders


class MoveRequest(BaseModel):
    file_id: int
    folder_id: int | None = None

@router.post("/move")
def move_file(
    data: MoveRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    file_id = data.file_id
    folder_id = data.folder_id

    file_record = db.query(UserFile).filter(
        UserFile.id == file_id,
        UserFile.user_id == current_user.id
    ).first()

    if not file_record:
        raise HTTPException(404, "File not found")

    file_record.folder_id = folder_id
    db.commit()
    db.refresh(file_record)

    return {"message": "File moved successfully"}

@router.get("/in_folder/{folder_id}")
def get_folder_contents(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Get folder info
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Get files in folder
    files = db.query(UserFile).filter(
        UserFile.folder_id == folder_id,
        UserFile.user_id == current_user.id
    ).all()

    # Prepare files data
    file_list = []
    for f in files:
        uploaded_at = f.uploaded_at.isoformat() if isinstance(f.uploaded_at, datetime) else f.uploaded_at
        file_list.append({
            "id": f.id,
            "filename": f.filename,
            "file_size": f.file_size,
            "uploaded_at": uploaded_at,
            "preview_url": generate_presigned_url(f.file_key),
            "download_url": generate_download_url(f.file_key, f.filename),
            "folder_id": f.folder_id
        })

    return {
        "folder": {
            "id": folder.id,
            "name": folder.name,
            "parent_id": folder.parent_id
        },
        "files": file_list
    }


@router.patch("/{folder_id}/rename")
def rename_folder(
    folder_id: int,
    new_name: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Check duplicate under same parent
    existing = db.query(Folder).filter(
        Folder.user_id == current_user.id,
        Folder.parent_id == folder.parent_id,
        Folder.name == new_name
    ).first()
    if existing and existing.id != folder.id:
        raise HTTPException(status_code=400, detail="Folder with this name already exists in the same parent")

    folder.name = new_name
    db.commit()
    db.refresh(folder)
    return folder


@router.delete("/{folder_id}")
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Delete all files in the folder from S3 and DB
    files = db.query(UserFile).filter(UserFile.folder_id == folder_id, UserFile.user_id == current_user.id).all()
    for f in files:
        try:
            delete_file_from_s3(f.file_key)
        except Exception:
            pass
        db.delete(f)

    # Delete the folder itself
    db.delete(folder)
    db.commit()

    return {"message": "Folder deleted"}


@router.get("/{folder_id}/download")
def download_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    files = db.query(UserFile).filter(UserFile.folder_id == folder_id, UserFile.user_id == current_user.id).all()

    # Create in-memory zip
    mem = io.BytesIO()
    with zipfile.ZipFile(mem, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            try:
                obj = s3.get_object(Bucket=BUCKET_NAME, Key=f.file_key)
                content = obj['Body'].read()
                # Extract just the filename from the S3 key (the last part after the last /)
                import os
                just_filename = os.path.basename(f.file_key)
                zf.writestr(just_filename, content)
            except Exception:
                # Skip files we can't read
                continue

    mem.seek(0)
    filename = f"{folder.name or 'folder'}_{folder.id}.zip"
    return StreamingResponse(mem, media_type='application/zip', headers={"Content-Disposition": f"attachment; filename=\"{filename}\""})