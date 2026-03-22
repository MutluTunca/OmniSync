"""add logo_url to companies

Revision ID: 0005_company_logo_url
Revises: 0004_company_limits_and_audit
Create Date: 2026-03-22
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_company_logo_url"
down_revision = "0004_company_limits_and_audit"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("logo_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("companies", "logo_url")
