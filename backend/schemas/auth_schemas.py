from pydantic import BaseModel

class RegisterSchema(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: str

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




