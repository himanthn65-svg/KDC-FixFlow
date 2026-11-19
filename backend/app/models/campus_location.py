from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.database.session import Base


class CampusLocation(Base):
    __tablename__ = "campus_locations"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(150), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)

    description = Column(Text, nullable=True)
    building = Column(String(150), nullable=True)
    floor = Column(String(50), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    def __repr__(self):
        return f"<CampusLocation(id={self.id}, name='{self.name}')>"
