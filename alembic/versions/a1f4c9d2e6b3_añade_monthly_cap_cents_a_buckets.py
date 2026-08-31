"""añade monthly_cap_cents a buckets

Revision ID: a1f4c9d2e6b3
Revises: 589dc34456b6
Create Date: 2026-08-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1f4c9d2e6b3'
down_revision: Union[str, Sequence[str], None] = '589dc34456b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('buckets', sa.Column('monthly_cap_cents', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('buckets', 'monthly_cap_cents')
