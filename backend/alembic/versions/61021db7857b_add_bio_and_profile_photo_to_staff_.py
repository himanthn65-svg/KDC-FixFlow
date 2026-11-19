
"""add bio and profile photo to staff profiles

Revision ID: 61021db7857b
Revises: 78e2b6fa1c9e
"""

from alembic import op
import sqlalchemy as sa

revision = "61021db7857b"
down_revision = "78e2b6fa1c9e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    existing_columns = {
        column["name"]
        for column in inspector.get_columns("staff_profiles")
    }

    if "bio" not in existing_columns:
        op.add_column(
            "staff_profiles",
            sa.Column("bio", sa.String(length=500), nullable=True),
        )

    if "profile_photo" not in existing_columns:
        op.add_column(
            "staff_profiles",
            sa.Column("profile_photo", sa.String(length=500), nullable=True),
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    existing_columns = {
        column["name"]
        for column in inspector.get_columns("staff_profiles")
    }

    if "profile_photo" in existing_columns:
        op.drop_column("staff_profiles", "profile_photo")

    if "bio" in existing_columns:
        op.drop_column("staff_profiles", "bio")
