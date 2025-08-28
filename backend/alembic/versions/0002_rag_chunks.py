"""rag chunks table

Revision ID: 0002
Revises: 0001
Create Date: 2025-08-28

"""
from alembic import op
import sqlalchemy as sa


revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create pgvector extension if available; ignore if not supported
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    except Exception:
        pass

    op.create_table(
        'rag_chunks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('url', sa.Text(), nullable=True),
        sa.Column('title', sa.Text(), nullable=True),
        sa.Column('product', sa.Text(), nullable=True),
        sa.Column('doc_type', sa.Text(), nullable=True),
        sa.Column('version', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('h_path', sa.Text(), nullable=True),
        sa.Column('content_md', sa.Text(), nullable=True),
        sa.Column('embedding', sa.types.UserDefinedType(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    # Indexes are created in ingestion script to ensure pgvector ops


def downgrade() -> None:
    op.drop_table('rag_chunks')


