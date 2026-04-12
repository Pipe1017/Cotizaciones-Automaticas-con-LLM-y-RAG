"""Quotation version control: version integer + parent FK

Revision ID: 008
Revises: 007
Create Date: 2026-04-12
"""
from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("quotations", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("quotations", sa.Column("parent_quotation_id", sa.Integer(),
                  sa.ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True))


def downgrade():
    op.drop_column("quotations", "parent_quotation_id")
    op.drop_column("quotations", "version")
