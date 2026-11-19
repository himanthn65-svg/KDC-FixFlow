from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.models.issue import IssueSeverity, IssuePriority, IssueStatus


class IssueCreate(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=10, max_length=5000)
    category: str = Field(min_length=2, max_length=100)
    location_id: int | None = Field(default=None, gt=0)
    location_name: str | None = Field(default=None, min_length=2, max_length=150)
    severity: IssueSeverity = IssueSeverity.MEDIUM
    is_safety_concern: bool = False


class IssuePhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str
    photo_type: str
    created_at: datetime


class IssueLocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str


class IssueResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    severity: IssueSeverity
    suggested_priority: IssuePriority | None
    priority: IssuePriority
    status: IssueStatus
    is_safety_concern: bool
    affected_count: int
    is_recurring: bool
    location: IssueLocationResponse
    photos: list[IssuePhotoResponse] = []
    created_at: datetime
    updated_at: datetime


class IssueReopenRequest(BaseModel):
    reason: str = Field(
        min_length=10,
        max_length=1000,
        description="Explain why the repair did not resolve the issue.",
    )
