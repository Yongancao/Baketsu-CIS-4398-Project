from pydantic import BaseModel, EmailStr, Field, validator

class RegisterSchema(BaseModel):
    name: str = Field(..., min_length=1, description="Name is required")
    email: EmailStr = Field(..., min_length=1, description="Email is not in correct format")
    password: str = Field(..., min_length=1, description="Password is required")
    confirm_password: str = Field(..., min_length=1, description="Password confirmation is required")

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




