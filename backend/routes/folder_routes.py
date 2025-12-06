from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user
from models.folder import Folder

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