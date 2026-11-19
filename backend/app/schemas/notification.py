from datetime import datetime
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    issue_id: int | None
    title: str
    message: str
    notification_type: str
    is_read: bool
    read_at: datetime | None
    created_at: datetime
