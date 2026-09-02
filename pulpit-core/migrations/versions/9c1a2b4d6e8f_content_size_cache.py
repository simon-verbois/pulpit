"""content size cache

Revision ID: 9c1a2b4d6e8f
Revises: 695ba61be082
Create Date: 2026-09-03 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '9c1a2b4d6e8f'
down_revision: str | None = '695ba61be082'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('component_content_sizes',
    sa.Column('component', sa.String(length=64), nullable=False),
    sa.Column('size_bytes', sa.BigInteger(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f('ix_component_content_sizes_component'),
        'component_content_sizes',
        ['component'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f('ix_component_content_sizes_component'), table_name='component_content_sizes'
    )
    op.drop_table('component_content_sizes')
