"""add posts comments replies

Revision ID: 0002_comments_posts_replies
Revises: 0001_initial
Create Date: 2026-03-11
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_comments_posts_replies"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "posts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("instagram_account_id", sa.UUID(), nullable=False),
        sa.Column("ig_media_id", sa.Text(), nullable=False),
        sa.Column("caption_text", sa.Text(), nullable=True),
        sa.Column("media_type", sa.Text(), nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("analysis_status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["instagram_account_id"], ["instagram_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ig_media_id"),
    )

    op.create_table(
        "comments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("post_id", sa.UUID(), nullable=False),
        sa.Column("ig_comment_id", sa.Text(), nullable=False),
        sa.Column("commenter_ig_user_id", sa.Text(), nullable=True),
        sa.Column("commenter_username", sa.Text(), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("language", sa.Text(), nullable=False, server_default="tr"),
        sa.Column("intent", sa.Text(), nullable=True),
        sa.Column("intent_confidence", sa.Numeric(4, 3), nullable=True),
        sa.Column("sentiment", sa.Text(), nullable=False, server_default="unknown"),
        sa.Column("is_sensitive", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("status", sa.Text(), nullable=False, server_default="new"),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ig_comment_id"),
    )

    op.create_table(
        "replies",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("comment_id", sa.UUID(), nullable=False),
        sa.Column("draft_text", sa.Text(), nullable=True),
        sa.Column("final_text", sa.Text(), nullable=True),
        sa.Column("generation_mode", sa.Text(), nullable=False, server_default="hybrid"),
        sa.Column("delay_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ig_reply_id", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["comment_id"], ["comments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("comment_id"),
    )

    op.create_index("idx_posts_company_posted", "posts", ["company_id", "posted_at"])
    op.create_index("idx_comments_company_status_received", "comments", ["company_id", "status", "received_at"])
    op.create_index("idx_comments_post_received", "comments", ["post_id", "received_at"])
    op.create_index("idx_replies_company_status_scheduled", "replies", ["company_id", "status", "scheduled_at"])


def downgrade() -> None:
    op.drop_index("idx_replies_company_status_scheduled", table_name="replies")
    op.drop_index("idx_comments_post_received", table_name="comments")
    op.drop_index("idx_comments_company_status_received", table_name="comments")
    op.drop_index("idx_posts_company_posted", table_name="posts")
    op.drop_table("replies")
    op.drop_table("comments")
    op.drop_table("posts")
