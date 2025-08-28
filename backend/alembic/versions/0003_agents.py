"""agents table

Revision ID: 0003
Revises: 0002
Create Date: 2025-08-28

"""
from alembic import op
import sqlalchemy as sa


revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'agents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('product', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('categories_json', sa.JSON(), nullable=True),
        sa.Column('tags_json', sa.JSON(), nullable=True),
        sa.Column('system_instructions', sa.Text(), nullable=False),
        sa.Column('knowledge_urls_json', sa.JSON(), nullable=True),
        sa.Column('defaults_json', sa.JSON(), nullable=True),
        sa.Column('is_enabled', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', 'product', name='uq_agents_name_product'),
    )
    op.create_index('idx_agents_product', 'agents', ['product'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_agents_product', table_name='agents')
    op.drop_table('agents')


