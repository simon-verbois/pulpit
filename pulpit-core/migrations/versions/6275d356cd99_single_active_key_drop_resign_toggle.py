"""single active key, drop resign toggle

Revision ID: 6275d356cd99
Revises: 72f928f61c80
Create Date: 2026-09-02 13:25:02.285879

Backfill and ALTER COLUMN rewritten to be dialect-portable (was a
Postgres-only `substring(... from ...)` SQL expression and bare
`op.alter_column`/`op.drop_column` calls - VERIFIED the former doesn't even
parse under SQLite, and SQLite has no `ALTER COLUMN`/reliable `DROP COLUMN`
at all, `batch_alter_table` is Alembic's own portable answer for both) so
this also runs against SQLite (embedded mode, docs/DEPLOYMENT.md). A fresh
install's tables are empty at this point in the chain regardless of
dialect - this only ever does real work on an existing Postgres deployment
upgrading from before this migration.
"""

import re
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '6275d356cd99'
down_revision: str | None = '72f928f61c80'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Nullable first, then backfilled, then tightened to NOT NULL - any
    # existing row's fingerprint is recoverable losslessly from its own
    # `bootstrap_command` text (a bare 40-hex-char token in a fixed
    # position - see pulp_bootstrap.py's pre-this-migration command
    # format), so this is a real backfill, not a placeholder default.
    op.add_column("signing_pulp_services", sa.Column("fingerprint", sa.String(length=64), nullable=True))

    connection = op.get_bind()
    signing_pulp_services = sa.table(
        "signing_pulp_services",
        sa.column("id"),
        sa.column("bootstrap_command", sa.Text()),
        sa.column("fingerprint", sa.String(length=64)),
    )
    rows = connection.execute(
        sa.select(signing_pulp_services.c.id, signing_pulp_services.c.bootstrap_command).where(
            signing_pulp_services.c.fingerprint.is_(None)
        )
    ).fetchall()
    for row_id, bootstrap_command in rows:
        match = re.search(r"[0-9A-Fa-f]{40}", bootstrap_command or "")
        if match:
            connection.execute(
                signing_pulp_services.update()
                .where(signing_pulp_services.c.id == row_id)
                .values(fingerprint=match.group(0))
            )

    with op.batch_alter_table("signing_pulp_services") as batch_op:
        batch_op.alter_column("fingerprint", nullable=False)
    with op.batch_alter_table("signing_settings") as batch_op:
        batch_op.drop_column("resign_existing_packages_enabled")


def downgrade() -> None:
    with op.batch_alter_table("signing_settings") as batch_op:
        batch_op.add_column(
            sa.Column(
                "resign_existing_packages_enabled",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
    with op.batch_alter_table("signing_pulp_services") as batch_op:
        batch_op.drop_column("fingerprint")
