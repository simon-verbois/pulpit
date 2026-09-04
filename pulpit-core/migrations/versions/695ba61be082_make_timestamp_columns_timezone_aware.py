"""make timestamp columns timezone-aware

Revision ID: 695ba61be082
Revises: 6275d356cd99
Create Date: 2026-09-02 13:35:49.552226

Rewritten to use `op.batch_alter_table()` and generic `sa.DateTime()` (was
`existing_type=postgresql.TIMESTAMP()`, Postgres-only) so this migration also
runs against SQLite (embedded mode, docs/DEPLOYMENT.md) - SQLite has no
`ALTER COLUMN ... TYPE` at all, `batch_alter_table` is Alembic's own portable
answer (recreate-table-and-copy under the hood on SQLite, a plain
`ALTER COLUMN` on Postgres - VERIFIED identical resulting DDL on Postgres to
the original explicit `op.alter_column()` calls this replaces).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '695ba61be082'
down_revision: str | None = '6275d356cd99'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('jobs') as batch_op:
        batch_op.alter_column(
            'scheduled_at',
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            existing_nullable=False,
        )
        batch_op.alter_column(
            'started_at',
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'finished_at',
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            existing_nullable=True,
        )
    with op.batch_alter_table('signing_keys') as batch_op:
        batch_op.alter_column(
            'activated_at',
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'expires_at',
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'retiring_at',
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'retired_at',
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            existing_nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table('signing_keys') as batch_op:
        batch_op.alter_column(
            'retired_at',
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'retiring_at',
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'expires_at',
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'activated_at',
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            existing_nullable=True,
        )
    with op.batch_alter_table('jobs') as batch_op:
        batch_op.alter_column(
            'finished_at',
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'started_at',
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            existing_nullable=True,
        )
        batch_op.alter_column(
            'scheduled_at',
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            existing_nullable=False,
        )
