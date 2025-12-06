from sqlalchemy import Column, Integer, String, ForeignKey
from core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)