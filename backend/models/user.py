from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, index=True, nullable=False) 
    email = Column(String, unique=True, index=True, nullable=False)

    password = Column(String, nullable=False)

    is_verified = Column(Boolean, nullable=False, default=False)
    verification_token = Column(String, unique=True, index=True, nullable=True)

    folder_id = Column(Integer, ForeignKey("folders.id", use_alter=True, name="fk_user_folder"), nullable=True)