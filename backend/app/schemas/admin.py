from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.issue import IssueSeverity, IssuePriority, IssueStatus


class AdminIssuePhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str
    photo_type: str
    created_at: datetime


class AdminIssueLocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str


class AdminIssueReporterResponse(BaseModel):
    id: int
    full_name: str
    email: str


class AdminIssueResponse(BaseModel):
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
    location: AdminIssueLocationResponse
    reporter: AdminIssueReporterResponse
    photos: list[AdminIssuePhotoResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class AdminIssueReviewRequest(BaseModel):
    notes: str | None = Field(default=None, max_length=1000)


class AdminIssuePriorityUpdate(BaseModel):
    priority: IssuePriority
    notes: str | None = Field(default=None, max_length=1000)


class AdminIssueVerificationRequest(BaseModel):
    notes: str = Field(
        min_length=5,
        max_length=1000,
        description="Administrator's repair verification notes.",
    )


from pydantic import BaseModel, Field


class AdminDeleteStudentRequest(BaseModel):
    reason: str = Field(
        min_length=10,
        max_length=1000,
        description="Reason for permanently deleting this student account.",
    )


class AdminDeleteComplaintRequest(BaseModel):
    reason: str = Field(
        min_length=10,
        max_length=1000,
        description="Reason for permanently deleting this complaint.",
    )
