from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


class CampusLocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    description: str | None = None
    building: str | None = None
    floor: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CampusLocationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    code: str = Field(min_length=2, max_length=50)
    description: str | None = None
    building: str | None = Field(default=None, max_length=150)
    floor: str | None = Field(default=None, max_length=50)

    @field_validator("name", "code", mode="before")
    @classmethod
    def clean_text(cls, value):
        if isinstance(value, str):
            value = value.strip()
        return value

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, value):
        return value.upper()


class CampusLocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    code: str | None = Field(default=None, min_length=2, max_length=50)
    description: str | None = None
    building: str | None = Field(default=None, max_length=150)
    floor: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None

    @field_validator("name", "code", mode="before")
    @classmethod
    def clean_text(cls, value):
        if isinstance(value, str):
            value = value.strip()
        return value

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, value):
        return value.upper() if value is not None else value
