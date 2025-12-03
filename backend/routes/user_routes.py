from fastapi import APIRouter, Depends
from core.security import get_current_user
from schemas.user_schemas import UserOut
from models import User

router = APIRouter()

@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user
