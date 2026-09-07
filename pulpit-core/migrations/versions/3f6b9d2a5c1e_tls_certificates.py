"""tls certificates

Revision ID: 3f6b9d2a5c1e
Revises: 1a2b3c4d5e6f
Create Date: 2026-09-07 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '3f6b9d2a5c1e'
down_revision: str | None = '1a2b3c4d5e6f'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'tls_certificates',
        sa.Column('source', sa.String(length=16), nullable=False),
        sa.Column('subject', sa.String(length=512), nullable=False),
        sa.Column('fingerprint_sha256', sa.String(length=64), nullable=False),
        sa.Column('not_before', sa.DateTime(timezone=True), nullable=False),
        sa.Column('not_after', sa.DateTime(timezone=True), nullable=False),
        sa.Column('freeipa_request_id', sa.String(length=64), nullable=True),
        sa.Column('freeipa_principal', sa.String(length=255), nullable=True),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_tls_certificates_fingerprint_sha256'),
        'tls_certificates',
        ['fingerprint_sha256'],
        unique=False,
    )
    op.create_index(
        op.f('ix_tls_certificates_not_after'),
        'tls_certificates',
        ['not_after'],
        unique=False,
    )

    op.create_table(
        'tls_certificate_history',
        sa.Column('event', sa.String(length=32), nullable=False),
        sa.Column('source', sa.String(length=16), nullable=False),
        sa.Column('fingerprint_sha256', sa.String(length=64), nullable=False),
        sa.Column('not_after', sa.DateTime(timezone=True), nullable=False),
        sa.Column('triggered_by', sa.String(length=32), nullable=False),
        sa.Column('notes', sa.Text(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('tls_certificate_history')
    op.drop_index(op.f('ix_tls_certificates_not_after'), table_name='tls_certificates')
    op.drop_index(op.f('ix_tls_certificates_fingerprint_sha256'), table_name='tls_certificates')
    op.drop_table('tls_certificates')
