from pydantic import BaseModel
from datetime import datetime

class FileOut(BaseModel):
    id: int
    filename: str
    file_size: int
    uploaded_at: datetime

    class Config:
        orm_mode = True
