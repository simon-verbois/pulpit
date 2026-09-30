"""ldap ca cert

Revision ID: f2c7d1a9e4b8
Revises: b7e2a4f9c1d6
Create Date: 2026-09-30 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = 'f2c7d1a9e4b8'
down_revision: str | None = 'b7e2a4f9c1d6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('ldap_settings', sa.Column('ca_cert', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('ldap_settings') as batch_op:
        batch_op.drop_column('ca_cert')
