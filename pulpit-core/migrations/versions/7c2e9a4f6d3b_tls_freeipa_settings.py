"""tls freeipa settings

Revision ID: 7c2e9a4f6d3b
Revises: 3f6b9d2a5c1e
Create Date: 2026-09-07 00:00:01.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '7c2e9a4f6d3b'
down_revision: str | None = '3f6b9d2a5c1e'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'tls_freeipa_settings',
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('base_url', sa.String(length=255), nullable=False),
        sa.Column('verify_tls', sa.Boolean(), nullable=False),
        sa.Column('common_name', sa.String(length=255), nullable=False),
        sa.Column('service_principal', sa.String(length=255), nullable=False),
        sa.Column('service_username', sa.String(length=255), nullable=False),
        sa.Column('service_password_encrypted', sa.Text(), nullable=True),
        sa.Column('ca', sa.String(length=64), nullable=False),
        sa.Column('profile', sa.String(length=64), nullable=True),
        sa.Column('auto_renew_enabled', sa.Boolean(), nullable=False),
        sa.Column('renew_before_days', sa.Integer(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('tls_freeipa_settings')
