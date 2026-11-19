
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AdminProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    bio: str | None = Field(default=None, max_length=500)


class AdminProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    full_name: str
    role: str
    bio: str | None = None
    profile_photo: str | None = None
    created_at: datetime
    updated_at: datetime
