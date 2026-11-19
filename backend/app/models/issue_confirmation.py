from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.session import Base


class IssueConfirmation(Base):
    __tablename__ = "issue_confirmations"

    __table_args__ = (
        UniqueConstraint(
            "issue_id",
            "student_id",
            name="uq_issue_student_confirmation",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    issue_id = Column(
        Integer,
        ForeignKey("issues.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    student_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    confirmed_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    issue = relationship("Issue", backref="confirmations")
    student = relationship("User")

    def __repr__(self):
        return (
            f"<IssueConfirmation(issue_id={self.issue_id}, "
            f"student_id={self.student_id})>"
        )
