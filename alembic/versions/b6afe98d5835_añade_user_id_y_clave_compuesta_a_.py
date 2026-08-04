"""añade user_id y clave compuesta a buckets y ledger_entries

Revision ID: b6afe98d5835
Revises: 80d8692422a2
Create Date: 2026-08-04 11:15:36.923274

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6afe98d5835'
down_revision: Union[str, Sequence[str], None] = '80d8692422a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('buckets', sa.Column('user_id', sa.String(), nullable=False))
    op.add_column('ledger_entries', sa.Column('user_id', sa.String(), nullable=False))
    op.drop_constraint(op.f('ledger_entries_bucket_id_fkey'), 'ledger_entries', type_='foreignkey')

    # Cambio de clave primaria de buckets: de (id) a (user_id, id).
    # Alembic no lo detecta solo con autogenerate, se añade a mano.
    op.drop_constraint('buckets_pkey', 'buckets', type_='primary')
    op.create_primary_key('buckets_pkey', 'buckets', ['user_id', 'id'])

    op.create_foreign_key(None, 'ledger_entries', 'buckets', ['user_id', 'bucket_id'], ['user_id', 'id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'ledger_entries', type_='foreignkey')

    op.drop_constraint('buckets_pkey', 'buckets', type_='primary')
    op.create_primary_key('buckets_pkey', 'buckets', ['id'])

    op.create_foreign_key(op.f('ledger_entries_bucket_id_fkey'), 'ledger_entries', 'buckets', ['bucket_id'], ['id'])
    op.drop_column('ledger_entries', 'user_id')
    op.drop_column('buckets', 'user_id')
