"""api compatibility checks

Revision ID: d3f10f8bb819
Revises: c4f8a2d6e1b3
Create Date: 2026-09-10 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = 'd3f10f8bb819'
down_revision: str | None = 'c4f8a2d6e1b3'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('api_compatibility_checks',
    sa.Column('checked_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('pulp_reachable', sa.Boolean(), nullable=False),
    sa.Column('missing_endpoints', sa.JSON(), nullable=False),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('api_compatibility_checks')
