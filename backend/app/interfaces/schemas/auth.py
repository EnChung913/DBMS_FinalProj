from pydantic import BaseModel, EmailStr
from typing import Literal

class RegisterRequest(BaseModel):
    real_name: str
    email: EmailStr
    username: str
    password: str
    nickname: str
    role: Literal["student", "department", "company"]
