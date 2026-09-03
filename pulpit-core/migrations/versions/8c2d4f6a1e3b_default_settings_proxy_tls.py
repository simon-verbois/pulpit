"""default settings proxy tls validation

Revision ID: 8c2d4f6a1e3b
Revises: 4f7a1e9c2b6d
Create Date: 2026-09-03 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '8c2d4f6a1e3b'
down_revision: str | None = '4f7a1e9c2b6d'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'default_settings',
        sa.Column(
            'proxy_tls_validation',
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.alter_column('default_settings', 'proxy_tls_validation', server_default=None)


def downgrade() -> None:
    op.drop_column('default_settings', 'proxy_tls_validation')
