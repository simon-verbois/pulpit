"""remove the TLS FreeIPA provider

Revision ID: c4f8a2d6e1b3
Revises: 7c2e9a4f6d3b
Create Date: 2026-09-08 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c4f8a2d6e1b3"
down_revision: str | None = "7c2e9a4f6d3b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # An installed CA-issued certificate remains usable after the provider is
    # removed, but its next replacement is now an administrator's manual job.
    op.execute("UPDATE tls_certificates SET source = 'manual' WHERE source = 'freeipa'")
    op.execute("UPDATE tls_certificate_history SET source = 'manual' WHERE source = 'freeipa'")
    op.execute("DELETE FROM jobs WHERE job_type LIKE 'tls.freeipa_%'")
    op.drop_table("tls_freeipa_settings")
    with op.batch_alter_table("tls_certificates") as batch_op:
        batch_op.drop_column("freeipa_principal")
        batch_op.drop_column("freeipa_request_id")


def downgrade() -> None:
    with op.batch_alter_table("tls_certificates") as batch_op:
        batch_op.add_column(sa.Column("freeipa_request_id", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("freeipa_principal", sa.String(length=255), nullable=True))

    op.create_table(
        "tls_freeipa_settings",
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("base_url", sa.String(length=255), nullable=False),
        sa.Column("verify_tls", sa.Boolean(), nullable=False),
        sa.Column("common_name", sa.String(length=255), nullable=False),
        sa.Column("service_principal", sa.String(length=255), nullable=False),
        sa.Column("service_username", sa.String(length=255), nullable=False),
        sa.Column("service_password_encrypted", sa.Text(), nullable=True),
        sa.Column("ca", sa.String(length=64), nullable=False),
        sa.Column("profile", sa.String(length=64), nullable=True),
        sa.Column("auto_renew_enabled", sa.Boolean(), nullable=False),
        sa.Column("renew_before_days", sa.Integer(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
