"""add company limit columns and audit logs

Revision ID: 0004_company_limits_and_audit
Revises: 0003_company_meta_token
Create Date: 2026-03-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004_company_limits_and_audit"
down_revision = "0003_company_meta_token"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns to companies
    op.add_column("companies", sa.Column("max_accounts", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("companies", sa.Column("daily_reply_limit", sa.Integer(), nullable=False, server_default="50"))
    op.add_column("companies", sa.Column("ai_model_tier", sa.Text(), nullable=False, server_default="gpt-4.1-mini"))
    
    # Create audit_logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_audit_logs_company_id", "audit_logs", ["company_id"])
    op.create_index("idx_audit_logs_event_type", "audit_logs", ["event_type"])
    op.create_index("idx_audit_logs_created_at", "audit_logs", ["created_at"])
    op.create_foreign_key("fk_audit_logs_company_id", "audit_logs", "companies", ["company_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_audit_logs_user_id", "audit_logs", "users", ["user_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_column("companies", "ai_model_tier")
    op.drop_column("companies", "daily_reply_limit")
    op.drop_column("companies", "max_accounts")
