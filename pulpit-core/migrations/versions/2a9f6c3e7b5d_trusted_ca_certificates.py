"""trusted ca certificates

Revision ID: 2a9f6c3e7b5d
Revises: 8c2d4f6a1e3b
Create Date: 2026-09-03 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '2a9f6c3e7b5d'
down_revision: str | None = '8c2d4f6a1e3b'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('trusted_ca_certificates',
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('pem', sa.Text(), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('last_error', sa.Text(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f('ix_trusted_ca_certificates_name'),
        'trusted_ca_certificates',
        ['name'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f('ix_trusted_ca_certificates_name'), table_name='trusted_ca_certificates'
    )
    op.drop_table('trusted_ca_certificates')
