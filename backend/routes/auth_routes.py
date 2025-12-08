from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from models import User
from schemas.auth_schemas import RegisterSchema, UserResponse, LoginSchema, LoginResponse
from core.security import hash_password, verify_password, create_access_token, get_current_user, generate_verification_token, generate_verification_link
from services.email_service import send_verification_email


router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse)
def register(payload: RegisterSchema, db: Session = Depends(get_db)):

    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords don't match try again")

    # Check duplicate email
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already taken")

    # Create new user
    new_user = User(
        email=payload.email.lower(),
        password=hash_password(payload.password),
        name=payload.name,
        is_verified=False,
        verification_token=generate_verification_token()
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send email verification
    send_verification_email(
        to=new_user.email,
        name=new_user.name,
        link=generate_verification_link(new_user.verification_token)
    )

    return new_user


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginSchema, db: Session = Depends(get_db)):
    # Look up user by email
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Email not verified. Please check your inbox."
        )

    token = create_access_token(user.email)

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            is_verified=user.is_verified
        )
    )


@router.get("/me", response_model=UserResponse)
def me(current_user = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        is_verified=current_user.is_verified
    )


@router.get("/verify/{token}")
def verify_account(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    user.is_verified = True
    user.verification_token = None
    db.commit()

    return {"message": "Email verified successfully"}
