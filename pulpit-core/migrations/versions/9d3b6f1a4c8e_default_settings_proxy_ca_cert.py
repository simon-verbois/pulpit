"""default settings proxy ca cert, drop trusted_ca_certificates

Revision ID: 9d3b6f1a4c8e
Revises: 2a9f6c3e7b5d
Create Date: 2026-09-03 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '9d3b6f1a4c8e'
down_revision: str | None = '2a9f6c3e7b5d'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'default_settings',
        sa.Column('proxy_ca_cert', sa.Text(), nullable=True),
    )
    # The trusted_ca module (docker-exec into the pulp container's own
    # /etc/pki/ca-trust) is replaced by this proxy_ca_cert column, applied
    # to each Remote's native `ca_cert` field instead - see
    # default_settings/models.py's docstring.
    op.drop_index(op.f('ix_trusted_ca_certificates_name'), table_name='trusted_ca_certificates')
    op.drop_table('trusted_ca_certificates')


def downgrade() -> None:
    op.create_table(
        'trusted_ca_certificates',
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('pem', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_trusted_ca_certificates_name'),
        'trusted_ca_certificates',
        ['name'],
        unique=True,
    )
    with op.batch_alter_table('default_settings') as batch_op:
        batch_op.drop_column('proxy_ca_cert')
