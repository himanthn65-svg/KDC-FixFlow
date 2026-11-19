
import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Integer,
    String,
)
from sqlalchemy.sql import func

from app.database.session import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    MAINTENANCE_STAFF = "maintenance_staff"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String(150), nullable=False)

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    password_hash = Column(String(255), nullable=False)

    role = Column(
        Enum(
            UserRole,
            name="user_role",
            values_callable=lambda enum_class: [
                item.value for item in enum_class
            ]
        ),
        nullable=False
    )

    is_active = Column(Boolean, default=True, nullable=False)

    # Admin profile fields
    bio = Column(String(500), nullable=True)

    profile_photo = Column(String(500), nullable=True)

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
        return (
            f"<User(id={self.id}, email='{self.email}', "
            f"role='{self.role.value}')>"
        )
