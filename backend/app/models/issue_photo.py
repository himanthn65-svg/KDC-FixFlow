from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.session import Base


class IssuePhoto(Base):
    __tablename__ = "issue_photos"

    id = Column(Integer, primary_key=True, index=True)

    issue_id = Column(
        Integer,
        ForeignKey("issues.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    uploaded_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    image_url = Column(String(1000), nullable=False)
    photo_type = Column(String(30), nullable=False, default="report")

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    issue = relationship("Issue", backref="photos")
    uploader = relationship("User")

    def __repr__(self):
        return f"<IssuePhoto(id={self.id}, issue_id={self.issue_id})>"
