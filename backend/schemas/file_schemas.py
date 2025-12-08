from pydantic import BaseModel
from datetime import datetime

class FileOut(BaseModel):
    id: int
    filename: str
    file_size: int
    uploaded_at: datetime

    class Config:
        from_attributes = True

class FileDetailResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    preview_url: str
    uploaded_at: str | datetime | None
    folder_id: int | None

    class Config:
        from_attributes = True

class FileListItem(BaseModel):
    id: int
    filename: str
    file_size: int
    uploaded_at: str | datetime | None = None
    folder_id: int | None = None

    class Config:
        from_attributes = True
