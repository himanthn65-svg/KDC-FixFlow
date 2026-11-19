import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.session import Base


class IssueSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IssuePriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IssueStatus(str, enum.Enum):
    REPORTED = "reported"
    REVIEWED = "reviewed"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    VERIFIED = "verified"
    CLOSED = "closed"
    REOPENED = "reopened"


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)

    severity = Column(
        Enum(
            IssueSeverity,
            name="issue_severity",
            values_callable=lambda enum_class: [item.value for item in enum_class],
        ),
        nullable=False,
        default=IssueSeverity.MEDIUM,
    )

    suggested_priority = Column(
        Enum(
            IssuePriority,
            name="issue_suggested_priority",
            values_callable=lambda enum_class: [item.value for item in enum_class],
        ),
        nullable=True,
    )

    priority = Column(
        Enum(
            IssuePriority,
            name="issue_priority",
            values_callable=lambda enum_class: [item.value for item in enum_class],
        ),
        nullable=False,
        default=IssuePriority.MEDIUM,
        index=True,
    )

    status = Column(
        Enum(
            IssueStatus,
            name="issue_status",
            values_callable=lambda enum_class: [item.value for item in enum_class],
        ),
        nullable=False,
        default=IssueStatus.REPORTED,
        index=True,
    )

    is_safety_concern = Column(Boolean, default=False, nullable=False)
    affected_count = Column(Integer, default=1, nullable=False)

    reported_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    location_id = Column(
        Integer,
        ForeignKey("campus_locations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    is_recurring = Column(Boolean, default=False, nullable=False)

    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    reporter = relationship("User", foreign_keys=[reported_by])
    location = relationship("CampusLocation")

    def __repr__(self):
        return f"<Issue(id={self.id}, title='{self.title}', status='{self.status.value}')>"
