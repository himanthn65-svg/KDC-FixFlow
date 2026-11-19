from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.session import Base


class RecurringIssue(Base):
    __tablename__ = "recurring_issues"

    id = Column(Integer, primary_key=True, index=True)

    location_id = Column(
        Integer,
        ForeignKey("campus_locations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    category = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)

    occurrence_count = Column(Integer, default=1, nullable=False)

    first_reported_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    last_reported_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    location = relationship("CampusLocation", backref="recurring_issues")

    def __repr__(self):
        return (
            f"<RecurringIssue(id={self.id}, category='{self.category}', "
            f"occurrences={self.occurrence_count})>"
        )
