"""add company meta token columns

Revision ID: 0003_company_meta_token
Revises: 0002_comments_posts_replies
Create Date: 2026-03-13
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_company_meta_token"
down_revision = "0002_comments_posts_replies"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("meta_access_token_encrypted", sa.Text(), nullable=True))
    op.add_column("companies", sa.Column("meta_token_expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("companies", "meta_token_expires_at")
    op.drop_column("companies", "meta_access_token_encrypted")
