import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("idx_messages_conversation_id", "conversation_id"),
        Index("idx_messages_mid", "ig_mid"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    
    # Meta specific identifiers
    ig_mid: Mapped[str] = mapped_column(Text, nullable=False, unique=True) # Message ID
    
    sender_id: Mapped[str] = mapped_column(Text, nullable=False)
    recipient_id: Mapped[str] = mapped_column(Text, nullable=False)
    
    direction: Mapped[str] = mapped_column(Text, nullable=False) # inbound, outbound
    message_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Attachment/Media handling for Vision support
    media_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_type: Mapped[str | None] = mapped_column(Text, nullable=True) # image, video, file
    
    raw_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    
    status: Mapped[str] = mapped_column(Text, nullable=False, default="received") # received, sent, failed, read
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
