from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.security import get_current_user
from core.database import get_db
from models import User, UserFile
from sqlalchemy import func

router = APIRouter()

@router.get("/storage")
def get_storage(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns total number of files and total storage in bytes
    for the currently logged-in user.
    """
    # Count how many files the user uploaded
    total_files = db.query(UserFile).filter(
        UserFile.user_id == current_user.id
    ).count()

    # Sum the file sizes for total storage
    total_bytes = db.query(func.sum(UserFile.file_size)).filter(
        UserFile.user_id == current_user.id
    ).scalar() or 0

    return {
        "total_files": total_files,
        "total_bytes": total_bytes
    }
