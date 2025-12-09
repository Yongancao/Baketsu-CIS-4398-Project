from pydantic import BaseModel, EmailStr, Field

class RegisterSchema(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    confirm_password: str = Field(..., min_length=1)

class LoginSchema(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    is_verified: bool

    class Config: 
        from_attributes = True

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

    class Config:
        from_attributes = True




