"""add ai_custom_instructions to companies

Revision ID: 0006_company_ai_instructions
Revises: 0005_company_logo_url
Create Date: 2026-03-25
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_company_ai_instructions"
down_revision = "0005_company_logo_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("ai_custom_instructions", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("companies", "ai_custom_instructions")
