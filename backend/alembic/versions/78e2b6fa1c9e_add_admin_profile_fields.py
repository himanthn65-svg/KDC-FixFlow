
"""add admin profile fields

Revision ID: 78e2b6fa1c9e
Revises: e6ccf48af2b9
"""

from alembic import op
import sqlalchemy as sa

revision = "78e2b6fa1c9e"
down_revision = "e6ccf48af2b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("bio", sa.String(length=500), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column("profile_photo", sa.String(length=500), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("users", "profile_photo")
    op.drop_column("users", "bio")
