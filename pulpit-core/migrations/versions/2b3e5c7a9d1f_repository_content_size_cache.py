"""repository content size cache

Revision ID: 2b3e5c7a9d1f
Revises: 9c1a2b4d6e8f
Create Date: 2026-09-03 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '2b3e5c7a9d1f'
down_revision: str | None = '9c1a2b4d6e8f'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('repository_content_sizes',
    sa.Column('repository_href', sa.String(length=512), nullable=False),
    sa.Column('size_bytes', sa.BigInteger(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f('ix_repository_content_sizes_repository_href'),
        'repository_content_sizes',
        ['repository_href'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f('ix_repository_content_sizes_repository_href'),
        table_name='repository_content_sizes',
    )
    op.drop_table('repository_content_sizes')
