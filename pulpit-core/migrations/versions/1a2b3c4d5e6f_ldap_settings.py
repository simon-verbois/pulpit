"""ldap settings

Revision ID: 1a2b3c4d5e6f
Revises: eb334ffffc23
Create Date: 2026-09-07 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '1a2b3c4d5e6f'
down_revision: str | None = 'eb334ffffc23'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('ldap_settings',
    sa.Column('enabled', sa.Boolean(), nullable=False),
    sa.Column('server_uri', sa.String(length=512), nullable=False),
    sa.Column('bind_dn', sa.String(length=512), nullable=False),
    sa.Column('bind_password_encrypted', sa.Text(), nullable=True),
    sa.Column('start_tls', sa.Boolean(), nullable=False),
    sa.Column('user_search_base', sa.String(length=512), nullable=False),
    sa.Column('user_search_filter', sa.String(length=512), nullable=False),
    sa.Column('group_search_base', sa.String(length=512), nullable=False),
    sa.Column('group_search_filter', sa.String(length=512), nullable=False),
    sa.Column('group_type', sa.String(length=32), nullable=False),
    sa.Column('require_group_dn', sa.String(length=512), nullable=True),
    sa.Column('mirror_groups', sa.Boolean(), nullable=False),
    sa.Column('attr_first_name', sa.String(length=64), nullable=False),
    sa.Column('attr_last_name', sa.String(length=64), nullable=False),
    sa.Column('attr_email', sa.String(length=64), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('ldap_settings')
