from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.work_order import WorkOrderStatus


class WorkOrderAssignRequest(BaseModel):
    assigned_to: int = Field(gt=0)
    admin_instructions: str | None = Field(default=None, max_length=3000)


class WorkOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    issue_id: int
    assigned_to: int
    assigned_by: int
    status: WorkOrderStatus
    admin_instructions: str | None
    staff_notes: str | None
    rejection_reason: str | None
    assigned_at: datetime
    accepted_at: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    updated_at: datetime
from pydantic import BaseModel, Field


class WorkOrderRejectRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=1000)


class WorkOrderCompleteRequest(BaseModel):
    staff_notes: str = Field(min_length=5, max_length=3000)
