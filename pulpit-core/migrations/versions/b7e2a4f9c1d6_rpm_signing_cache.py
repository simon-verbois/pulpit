"""rpm signing cache

Revision ID: b7e2a4f9c1d6
Revises: 5e1f8a3c7d2b
Create Date: 2026-09-10 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = 'b7e2a4f9c1d6'
down_revision: str | None = '5e1f8a3c7d2b'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'rpm_signing_cache',
        sa.Column('source_sha256', sa.String(length=64), nullable=False),
        sa.Column('fingerprint', sa.String(length=64), nullable=False),
        sa.Column('source_content_href', sa.String(length=512), nullable=True),
        sa.Column('signed_sha256', sa.String(length=64), nullable=True),
        sa.Column('signed_content_href', sa.String(length=512), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('signed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_sha256', 'fingerprint', name='uq_rpm_signing_cache_source_fingerprint'),
    )
    op.create_index(
        op.f('ix_rpm_signing_cache_source_sha256'), 'rpm_signing_cache', ['source_sha256'], unique=False
    )
    op.create_index(
        op.f('ix_rpm_signing_cache_fingerprint'), 'rpm_signing_cache', ['fingerprint'], unique=False
    )
    op.create_index(
        op.f('ix_rpm_signing_cache_status'), 'rpm_signing_cache', ['status'], unique=False
    )

    op.create_table(
        'signing_repository_sync_state',
        sa.Column('repository_href', sa.String(length=512), nullable=False),
        sa.Column('last_processed_version', sa.Integer(), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_signing_repository_sync_state_repository_href'),
        'signing_repository_sync_state',
        ['repository_href'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f('ix_signing_repository_sync_state_repository_href'),
        table_name='signing_repository_sync_state',
    )
    op.drop_table('signing_repository_sync_state')

    op.drop_index(op.f('ix_rpm_signing_cache_status'), table_name='rpm_signing_cache')
    op.drop_index(op.f('ix_rpm_signing_cache_fingerprint'), table_name='rpm_signing_cache')
    op.drop_index(op.f('ix_rpm_signing_cache_source_sha256'), table_name='rpm_signing_cache')
    op.drop_table('rpm_signing_cache')
