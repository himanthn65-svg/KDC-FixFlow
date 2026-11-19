from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StaffCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8)
    employee_id: str = Field(..., min_length=1, max_length=50)
    department: str = Field(..., min_length=1, max_length=100)
    specialization: Optional[str] = Field(default=None, max_length=150)
    phone_number: Optional[str] = Field(default=None, max_length=20)


class StaffResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    employee_id: str
    department: str
    specialization: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class StaffStatusUpdate(BaseModel):
    is_active: bool


class StaffProfileResponse(BaseModel):
    user_id: int
    full_name: str
    email: EmailStr
    role: str
    employee_id: str
    department: str
    specialization: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    profile_photo: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class StaffProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    bio: Optional[str] = Field(default=None, max_length=500)