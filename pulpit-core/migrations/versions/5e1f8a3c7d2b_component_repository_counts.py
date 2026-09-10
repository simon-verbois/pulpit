"""component repository counts

Revision ID: 5e1f8a3c7d2b
Revises: d3f10f8bb819
Create Date: 2026-09-10 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '5e1f8a3c7d2b'
down_revision: str | None = 'd3f10f8bb819'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('component_repository_counts',
    sa.Column('component', sa.String(length=64), nullable=False),
    sa.Column('count', sa.Integer(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f('ix_component_repository_counts_component'),
        'component_repository_counts',
        ['component'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f('ix_component_repository_counts_component'),
        table_name='component_repository_counts',
    )
    op.drop_table('component_repository_counts')
