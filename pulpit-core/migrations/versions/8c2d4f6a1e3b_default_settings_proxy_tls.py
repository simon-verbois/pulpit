"""default settings proxy tls validation

Revision ID: 8c2d4f6a1e3b
Revises: 4f7a1e9c2b6d
Create Date: 2026-09-03 00:00:00.000000

The "drop the now-unneeded server_default" step rewritten to use
`op.batch_alter_table()` (was a bare `op.alter_column`) so this also runs
against SQLite (embedded mode, docs/DEPLOYMENT.md) - SQLite has no
`ALTER COLUMN ... DROP DEFAULT`, `batch_alter_table` is Alembic's own
portable answer (VERIFIED identical resulting DDL on Postgres to the
original bare call).
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
    with op.batch_alter_table('default_settings') as batch_op:
        batch_op.alter_column('proxy_tls_validation', server_default=None)


def downgrade() -> None:
    with op.batch_alter_table('default_settings') as batch_op:
        batch_op.drop_column('proxy_tls_validation')
