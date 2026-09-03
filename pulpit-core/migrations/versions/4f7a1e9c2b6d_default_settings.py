"""default settings

Revision ID: 4f7a1e9c2b6d
Revises: 2b3e5c7a9d1f
Create Date: 2026-09-03 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '4f7a1e9c2b6d'
down_revision: str | None = '2b3e5c7a9d1f'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('default_settings',
    sa.Column('proxy_url', sa.String(length=2048), nullable=False),
    sa.Column('proxy_username', sa.String(length=255), nullable=False),
    sa.Column('proxy_password_encrypted', sa.Text(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('default_settings')
