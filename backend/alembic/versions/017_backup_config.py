"""Backup configuration and log tables

Revision ID: 017
Revises: 016
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = '017'
down_revision = '016'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'backup_config',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('rclone_remote', sa.String(100), nullable=True),   # ej: "gdrive"
        sa.Column('remote_path', sa.String(300), nullable=True),     # ej: "OPEX-Backup"
        sa.Column('include_db', sa.Boolean(), default=True),
        sa.Column('include_files', sa.Boolean(), default=True),
        sa.Column('schedule_hour', sa.Integer(), default=2),         # hora UTC del cron (0-23)
        sa.Column('enabled', sa.Boolean(), default=False),
        sa.Column('last_run_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_run_status', sa.String(20), nullable=True),  # ok | error | running
        sa.Column('last_run_log', sa.Text(), nullable=True),
    )
    op.create_table(
        'backup_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(20)),
        sa.Column('log', sa.Text(), nullable=True),
        sa.Column('size_mb', sa.Numeric(10, 2), nullable=True),
    )


def downgrade():
    op.drop_table('backup_logs')
    op.drop_table('backup_config')
