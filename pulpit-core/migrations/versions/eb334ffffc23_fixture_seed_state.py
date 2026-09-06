"""fixture seed state

Revision ID: eb334ffffc23
Revises: 7a4d2e8f1c9b
Create Date: 2026-09-06 09:57:44.397961
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = 'eb334ffffc23'
down_revision: str | None = '7a4d2e8f1c9b'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('fixture_seed_state',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('fixture_seed_state')
