from sqlalchemy import Column, Integer, String, ForeignKey, BigInteger, DateTime
from sqlalchemy.sql import func
from core.database import Base
from sqlalchemy.orm import relationship

class UserFile(Base):
    __tablename__ = "user_files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)

    filename = Column(String, nullable=False)
    file_key = Column(String, nullable=False, index=True)  # S3 object key (removed unique constraint)
    file_size = Column(BigInteger, nullable=False)  # Size in bytes

    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    folder = relationship("Folder", back_populates="files")
    deleted_at = Column(DateTime(timezone=True), nullable=True)


class FileStorageHistory(Base):
    """Track file storage periods for billing calculations"""
    __tablename__ = "file_storage_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_key = Column(String, nullable=False)
    file_size = Column(BigInteger, nullable=False)  # Size in bytes
    uploaded_at = Column(DateTime(timezone=True), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=False)
    
    # Store calculated cost for this storage period
    storage_cost = Column(BigInteger, nullable=True)  # Cost in smallest currency unit (e.g., cents)