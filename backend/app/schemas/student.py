from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StudentProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    full_name: str
    email: EmailStr
    role: str
    student_id: str
    department: str
    academic_year: str
    bio: str | None = None
    profile_photo: str | None = None
    created_at: datetime
    updated_at: datetime


class StudentProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    bio: str | None = Field(default=None, max_length=500)
