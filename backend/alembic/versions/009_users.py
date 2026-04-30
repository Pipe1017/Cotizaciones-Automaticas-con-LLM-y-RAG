"""Tabla de usuarios con roles viewer/editor

Revision ID: 009
Revises: 008
Create Date: 2026-04-30
"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("username", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("hashed_password", sa.String(200), nullable=False),
        sa.Column("rol", sa.String(10), nullable=False, server_default="viewer"),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("users")
