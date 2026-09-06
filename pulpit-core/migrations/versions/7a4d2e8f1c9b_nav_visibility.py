"""nav visibility

Revision ID: 7a4d2e8f1c9b
Revises: 9d3b6f1a4c8e
Create Date: 2026-09-05 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '7a4d2e8f1c9b'
down_revision: str | None = '9d3b6f1a4c8e'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('nav_visible_modules',
    sa.Column('module_id', sa.String(length=255), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('module_id'),
    )


def downgrade() -> None:
    op.drop_table('nav_visible_modules')
