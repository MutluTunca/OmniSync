import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (
        Index("idx_comments_company_status_received", "company_id", "status", "received_at"),
        Index("idx_comments_post_received", "post_id", "received_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    post_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    ig_comment_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    commenter_ig_user_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    commenter_username: Mapped[str | None] = mapped_column(Text, nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(Text, nullable=False, default="tr")
    intent: Mapped[str | None] = mapped_column(Text, nullable=True)
    intent_confidence: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    sentiment: Mapped[str] = mapped_column(Text, nullable=False, default="unknown")
    is_sensitive: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="new")
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
