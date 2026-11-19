from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.session import Base
from app.models.issue import IssueStatus


class IssueHistory(Base):
    __tablename__ = "issue_history"

    id = Column(Integer, primary_key=True, index=True)

    issue_id = Column(
        Integer,
        ForeignKey("issues.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    changed_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    previous_status = Column(
        Enum(
            IssueStatus,
            name="issue_status",
            values_callable=lambda enum_class: [item.value for item in enum_class],
        ),
        nullable=True,
    )

    new_status = Column(
        Enum(
            IssueStatus,
            name="issue_status",
            values_callable=lambda enum_class: [item.value for item in enum_class],
        ),
        nullable=False,
    )

    notes = Column(Text, nullable=True)

    changed_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    issue = relationship("Issue", backref="status_history")
    changed_by_user = relationship("User")

    def __repr__(self):
        return (
            f"<IssueHistory(issue_id={self.issue_id}, "
            f"new_status='{self.new_status.value}')>"
        )
