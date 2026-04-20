import random
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.db.session import SessionLocal
from app.models.comment import Comment
from app.models.conversation import Conversation
from app.models.instagram_account import InstagramAccount
from app.models.message import Message
from app.models.post import Post
from app.models.reply import Reply
from app.models.webhook_event import WebhookEvent
from app.services.intent_service import classify_intent
from app.services.reply_service import generate_reply
from app.workers.celery_app import celery_app
from app.core.config import settings
from app.integrations.meta_client import MetaGraphClient
from app.models.company import Company
from app.models.audit_log import AuditLog
from app.services.notification_service import notify_critical_comment
from sqlalchemy import func
import httpx


def _ensure_post(
    db,
    account: InstagramAccount,
    media_id: str,
    caption_text: str | None,
    media_type: str | None,
    posted_at: datetime | None,
) -> Post:
    post = db.query(Post).filter(Post.ig_media_id == str(media_id)).first()
    if post:
        return post

    post = Post(
        company_id=account.company_id,
        instagram_account_id=account.id,
        ig_media_id=str(media_id),
        caption_text=caption_text,
        media_type=media_type,
        posted_at=posted_at or datetime.now(timezone.utc),
        analysis_status="pending",
    )
    db.add(post)
    db.flush()
    return post


def _insert_comment_and_dispatch(
    db,
    account: InstagramAccount,
    post: Post,
    comment_id: str,
    text: str,
    commenter_id: str | None,
    commenter_username: str | None,
    received_at: datetime | None,
) -> str | None:
    exists = db.query(Comment).filter(Comment.ig_comment_id == str(comment_id)).first()
    if exists:
        return None

    comment = Comment(
        company_id=account.company_id,
        post_id=post.id,
        ig_comment_id=str(comment_id),
        commenter_ig_user_id=str(commenter_id or ""),
        commenter_username=commenter_username,
        text=text,
        language="tr",
        status="new",
        sentiment="unknown",
        is_sensitive=False,
        received_at=received_at or datetime.now(timezone.utc),
    )
    db.add(comment)
    db.flush()
    return str(comment.id)


def _account_token_health(account: InstagramAccount) -> str:
    if not account.access_token_encrypted:
        return "missing"
    if not account.token_expires_at:
        return "unknown"
    now = datetime.now(timezone.utc)
    threshold = now + timedelta(hours=settings.token_refresh_threshold_hours)
    if account.token_expires_at <= now:
        return "expired"
    if account.token_expires_at <= threshold:
        return "expiring_soon"
    return "active"


def _resolve_access_token(db, account: InstagramAccount) -> str | None:
    company = db.get(Company, account.company_id)
    if company and company.meta_access_token_encrypted:
        return company.meta_access_token_encrypted
    if account.access_token_encrypted:
        return account.access_token_encrypted
    return None


@celery_app.task(name="app.workers.tasks.check_operational_alerts")
def check_operational_alerts() -> None:
    """
    Periodically checks queue backlog and webhook backlog thresholds.
    Sends Slack alert if any threshold is exceeded.
    """
    from app.core.config import settings
    from app.db.session import SessionLocal
    from sqlalchemy import func

    slack_url = settings.slack_webhook_url
    if not slack_url:
        return

    # Check queue backlog
    backlog = {}
    try:
        from redis import Redis
        r = Redis.from_url(settings.celery_broker_url)
        prefix = (celery_app.conf.broker_transport_options or {}).get("queue_prefix", "celery")
        for q in ["webhooks", "ai", "outbound"]:
            cnt = r.llen(q)
            if cnt == 0:
                cnt = r.llen(f"{prefix}:{q}")
            backlog[q] = cnt
    except Exception:
        backlog = {}

    alerts = []
    # Queue alerts
    for q, cnt in backlog.items():
        if isinstance(cnt, int) and cnt >= settings.queue_alert_threshold:
            alerts.append(f"[ALERT] Queue backlog for '{q}': {cnt}")

    # Check webhook backlog
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    pending = db.query(func.count(WebhookEvent.id)).filter(WebhookEvent.processed.is_(False)).scalar() or 0
    oldest = (
        db.query(WebhookEvent)
        .filter(WebhookEvent.processed.is_(False))
        .order_by(WebhookEvent.created_at.asc())
        .first()
    )
    oldest_age = int((now - oldest.created_at).total_seconds()) if oldest else 0

    if pending >= settings.webhook_pending_alert_threshold:
        alerts.append(f"[ALERT] Pending webhooks count: {pending}")
    if oldest_age >= settings.webhook_oldest_pending_alert_sec:
        alerts.append(f"[ALERT] Oldest pending webhook age (s): {oldest_age}")

    # Check token health for all active accounts
    from app.models.instagram_account import InstagramAccount
    accounts = db.query(InstagramAccount).filter(InstagramAccount.is_active.is_(True)).all()
    for acc in accounts:
        health = _account_token_health(acc)
        ident = acc.username or acc.ig_user_id
        if health in ("expired", "missing", "unknown"):
            alerts.append(f"[ALERT] Account {ident} token health is {health.upper()}!")
        elif health == "expiring_soon":
            alerts.append(f"[WARNING] Account {ident} token is expiring soon!")

    db.close()

    if alerts:
        payload = {"text": "\n".join(alerts)}
        try:
            httpx.post(slack_url, json=payload, timeout=10)
        except Exception:
            pass


@celery_app.task(name="app.workers.tasks.process_webhook_event")
def process_webhook_event(event_id: str) -> dict[str, str]:
    db = SessionLocal()
    try:
        event = db.get(WebhookEvent, UUID(event_id))
        if not event:
            return {"status": "missing"}
        if event.processed:
            return {"status": "already_processed"}

        payload = event.payload or {}
        entries = payload.get("entry", [])
        queued_comment_ids: list[str] = []

        for entry in entries:
            # Handle Instagram Messaging (DMs)
            if "messaging" in entry:
                for messaging_event in entry.get("messaging", []):
                    # ig_user_id here is the ID of the professional account (recipient of the event)
                    # recipient_id is the Page/Account receiving the message
                    # sender_id is the User sending the message
                    recipient_id = messaging_event.get("recipient", {}).get("id")
                    
                    account = None
                    if recipient_id:
                        account = db.query(InstagramAccount).filter(InstagramAccount.ig_user_id == str(recipient_id)).first()
                    
                    if not account:
                        continue

                    # Dispatch to DM processing task
                    celery_app.send_task("app.workers.tasks.process_messaging_event", args=[str(event.id), messaging_event])

            # Handle Changes (Comments)
            for change in entry.get("changes", []):
                value = change.get("value", {})
                ig_user_id = value.get("instagram_id") or entry.get("id")
                account = None
                if ig_user_id:
                    account = db.query(InstagramAccount).filter(InstagramAccount.ig_user_id == str(ig_user_id)).first()
                if not account:
                    continue

                media_id = value.get("media", {}).get("id") or value.get("media_id")
                if not media_id:
                    continue

                post = _ensure_post(
                    db=db,
                    account=account,
                    media_id=str(media_id),
                    caption_text=value.get("text") or value.get("caption"),
                    media_type=value.get("media", {}).get("media_type") or value.get("media_type"),
                    posted_at=datetime.now(timezone.utc),
                )

                comment_id = value.get("id") or value.get("comment_id")
                text = value.get("text")
                if comment_id and text:
                    new_comment_id = _insert_comment_and_dispatch(
                        db=db,
                        account=account,
                        post=post,
                        comment_id=str(comment_id),
                        text=text,
                        commenter_id=value.get("from", {}).get("id"),
                        commenter_username=value.get("from", {}).get("username"),
                        received_at=datetime.now(timezone.utc),
                    )
                    if new_comment_id:
                        queued_comment_ids.append(new_comment_id)

        event.processed = True
        event.processed_at = datetime.now(timezone.utc)
        db.add(event)
        db.commit()
        for comment_id in queued_comment_ids:
            celery_app.send_task("app.workers.tasks.analyze_comment_intent", args=[comment_id])
        return {"status": "processed"}
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.poll_instagram_comments")
def poll_instagram_comments() -> dict[str, int]:
    db = SessionLocal()
    discovered_comments = 0
    checked_accounts = 0
    client = MetaGraphClient()

    try:
        accounts = db.query(InstagramAccount).filter(InstagramAccount.is_active.is_(True)).all()
        for account in accounts:
            checked_accounts += 1
            resolved_token = _resolve_access_token(db, account)
            if not resolved_token:
                continue

            try:
                media_response = client.fetch_recent_media(
                    ig_user_id=account.ig_user_id,
                    access_token=resolved_token,
                    limit=settings.polling_media_limit,
                )
                media_items = media_response.get("data", [])
                queued_comment_ids: list[str] = []

                for media in media_items:
                    media_id = media.get("id")
                    if not media_id:
                        continue

                    posted_at = None
                    raw_timestamp = media.get("timestamp")
                    if raw_timestamp:
                        try:
                            posted_at = datetime.fromisoformat(raw_timestamp.replace("Z", "+00:00"))
                        except ValueError:
                            posted_at = datetime.now(timezone.utc)

                    post = _ensure_post(
                        db=db,
                        account=account,
                        media_id=str(media_id),
                        caption_text=media.get("caption"),
                        media_type=media.get("media_type"),
                        posted_at=posted_at,
                    )

                    comments_response = client.fetch_media_comments(
                        media_id=str(media_id),
                        access_token=resolved_token,
                        limit=settings.polling_comments_limit,
                    )

                    for entry in comments_response.get("data", []):
                        comment_id = entry.get("id")
                        text = entry.get("text")
                        if not comment_id or not text:
                            continue

                        new_comment_id = _insert_comment_and_dispatch(
                            db=db,
                            account=account,
                            post=post,
                            comment_id=str(comment_id),
                            text=text,
                            commenter_id=entry.get("from", {}).get("id"),
                            commenter_username=entry.get("from", {}).get("username"),
                            received_at=datetime.now(timezone.utc),
                        )
                        if new_comment_id:
                            discovered_comments += 1
                            queued_comment_ids.append(new_comment_id)

                account.last_synced_at = datetime.now(timezone.utc)
                account.updated_at = datetime.now(timezone.utc)
                db.add(account)
                db.commit()
                for comment_id in queued_comment_ids:
                    celery_app.send_task("app.workers.tasks.analyze_comment_intent", args=[comment_id])

            except Exception:
                db.rollback()
                continue

        return {
            "checked_accounts": checked_accounts,
            "discovered_comments": discovered_comments,
        }
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.refresh_instagram_tokens")
def refresh_instagram_tokens() -> dict[str, int]:
    db = SessionLocal()
    checked_companies = 0
    refreshed_companies = 0
    failed_companies = 0
    skipped_companies = 0
    updated_accounts = 0
    client = MetaGraphClient()

    try:
        companies = db.query(Company).all()
        now = datetime.now(timezone.utc)
        threshold = now + timedelta(hours=settings.token_refresh_threshold_hours)

        for company in companies:
            checked_companies += 1
            if not company.meta_access_token_encrypted:
                seed_account = (
                    db.query(InstagramAccount)
                    .filter(InstagramAccount.company_id == company.id)
                    .filter(InstagramAccount.is_active.is_(True))
                    .filter(InstagramAccount.access_token_encrypted.isnot(None))
                    .first()
                )
                if seed_account and seed_account.access_token_encrypted:
                    company.meta_access_token_encrypted = seed_account.access_token_encrypted
                    company.meta_token_expires_at = seed_account.token_expires_at
                    company.updated_at = datetime.now(timezone.utc)
                    db.add(company)
                    db.commit()
                else:
                    skipped_companies += 1
                    continue

            should_refresh = False
            if not company.meta_token_expires_at:
                should_refresh = True
            elif company.meta_token_expires_at <= threshold:
                should_refresh = True

            if not should_refresh:
                skipped_companies += 1
                continue

            try:
                token_data = client.refresh_access_token(company.meta_access_token_encrypted)
                new_token = token_data.get("access_token")
                expires_in = token_data.get("expires_in")
                if not new_token:
                    failed_companies += 1
                    continue

                company.meta_access_token_encrypted = str(new_token)
                if isinstance(expires_in, int) and expires_in > 0:
                    company.meta_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                elif not company.meta_token_expires_at:
                    company.meta_token_expires_at = datetime.now(timezone.utc) + timedelta(days=settings.token_assumed_expiry_days)

                company.updated_at = datetime.now(timezone.utc)
                db.add(company)

                company_accounts = db.query(InstagramAccount).filter(InstagramAccount.company_id == company.id).all()
                for account in company_accounts:
                    account.access_token_encrypted = company.meta_access_token_encrypted
                    account.token_expires_at = company.meta_token_expires_at
                    account.updated_at = datetime.now(timezone.utc)
                    db.add(account)
                    updated_accounts += 1

                db.commit()
                refreshed_companies += 1
            except Exception:
                db.rollback()
                failed_companies += 1

        return {
            "checked_companies": checked_companies,
            "refreshed_companies": refreshed_companies,
            "failed_companies": failed_companies,
            "skipped_companies": skipped_companies,
            "updated_accounts": updated_accounts,
        }
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.analyze_comment_intent")
def analyze_comment_intent(comment_id: str) -> dict[str, str]:
    db = SessionLocal()
    try:
        comment = db.get(Comment, UUID(comment_id))
        if not comment:
            return {"status": "missing"}

        intent, confidence, is_sensitive, _reason = classify_intent(comment.text)
        comment.intent = intent
        comment.intent_confidence = confidence
        comment.is_sensitive = is_sensitive
        comment.status = "pending_approval" if (settings.manual_approval_default or is_sensitive) else "new"
        comment.updated_at = datetime.now(timezone.utc)
        db.add(comment)
        db.commit()

        # SMART Notification for Priority #2
        if is_sensitive or intent == "complaint":
            try:
                company = db.get(Company, comment.company_id)
                notify_critical_comment(
                    comment_text=comment.text,
                    username=comment.commenter_username or "unknown",
                    intent=intent or "unknown",
                    company_name=company.name if company else "OmniSync"
                )
            except Exception:
                pass

        if not settings.manual_approval_default and not is_sensitive and intent != "spam_irrelevant":
            celery_app.send_task("app.workers.tasks.generate_comment_reply", args=[str(comment.id)])

        return {"status": "classified", "intent": intent}
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.generate_comment_reply")
def generate_comment_reply(comment_id: str) -> dict[str, str]:
    db = SessionLocal()
    try:
        comment = db.get(Comment, UUID(comment_id))
        if not comment:
            return {"status": "missing"}
        if comment.intent == "spam_irrelevant":
            comment.status = "skipped"
            db.add(comment)
            db.commit()
            
            # Log spam skip
            db.add(AuditLog(
                company_id=comment.company_id,
                event_type="comment_skipped",
                description=f"Comment {comment_id} skipped as spam/irrelevant.",
                payload={"intent": comment.intent}
            ))
            db.commit()
            return {"status": "skipped_spam"}

        # Enforce subscription limits
        company = db.get(Company, comment.company_id)
        if company:
            today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            reply_count = (
                db.query(func.count(Reply.id))
                .filter(Reply.company_id == company.id)
                .filter(Reply.created_at >= today_start)
                .scalar()
            ) or 0
            if reply_count >= company.daily_reply_limit:
                comment.status = "skipped"
                comment.updated_at = datetime.now(timezone.utc)
                db.add(comment)
                db.commit()
                return {"status": "limit_reached", "company": company.id, "limit": company.daily_reply_limit}

        recent_rows = (
            db.query(Reply.final_text)
            .filter(Reply.company_id == comment.company_id)
            .filter(Reply.final_text.isnot(None))
            .order_by(Reply.created_at.desc())
            .limit(8)
            .all()
        )
        recent_replies = [row[0] for row in recent_rows if row[0]]

        # Fetch media info for vision context
        media_url = None
        media_caption = None
        post = db.get(Post, comment.post_id)
        if post:
            media_caption = post.caption_text
            try:
                account = db.get(InstagramAccount, post.instagram_account_id)
                if account and account.access_token_encrypted:
                    m_data = MetaGraphClient().fetch_media_details(post.ig_media_id, account.access_token_encrypted)
                    media_url = m_data.get("media_url")
                    if not media_caption:
                        media_caption = m_data.get("caption")
            except Exception:
                pass

        text = generate_reply(
            comment_text=comment.text,
            intent=comment.intent or "general_interest",
            username=comment.commenter_username,
            recent_replies=recent_replies,
            media_url=media_url,
            media_caption=media_caption,
            company_instructions=company.ai_custom_instructions if company else None,
            ai_model=company.ai_model_tier if company else None,
        )
        if not text:
            comment.status = "skipped"
            db.add(comment)
            db.commit()
            return {"status": "empty_reply"}

        reply = db.query(Reply).filter(Reply.comment_id == comment.id).first()
        if not reply:
            reply = Reply(
                company_id=comment.company_id,
                comment_id=comment.id,
                draft_text=text,
                final_text=text,
                generation_mode="hybrid",
                status="draft" if settings.manual_approval_default else "scheduled",
            )
        else:
            reply.draft_text = text
            reply.final_text = text
            reply.status = "draft" if settings.manual_approval_default else "scheduled"

        if settings.manual_approval_default:
            comment.status = "pending_approval"
        else:
            delay_sec = random.randint(settings.reply_delay_min_sec, settings.reply_delay_max_sec)
            reply.delay_seconds = delay_sec
            reply.scheduled_at = datetime.now(timezone.utc)
            comment.status = "new"

        comment.updated_at = datetime.now(timezone.utc)
        reply.updated_at = datetime.now(timezone.utc)
        db.add(reply)
        db.add(comment)
        db.commit()
        db.refresh(reply)

        if not settings.manual_approval_default:
            celery_app.send_task("app.workers.tasks.send_reply", args=[str(reply.id)], countdown=reply.delay_seconds)

        return {"status": "reply_ready", "reply_id": str(reply.id)}
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.send_reply")
def send_reply(reply_id: str) -> dict[str, str]:
    db = SessionLocal()
    try:
        reply = db.get(Reply, UUID(reply_id))
        if not reply:
            return {"status": "missing"}
        if not reply.final_text:
            reply.status = "failed"
            reply.failure_reason = "empty_final_text"
            db.add(reply)
            db.commit()
            return {"status": "failed"}

        comment = db.get(Comment, reply.comment_id)
        if not comment:
            reply.status = "failed"
            reply.failure_reason = "comment_not_found"
            db.add(reply)
            db.commit()
            return {"status": "failed"}

        post = db.get(Post, comment.post_id)
        if not post:
            reply.status = "failed"
            reply.failure_reason = "post_not_found"
            db.add(reply)
            db.commit()
            return {"status": "failed"}

        account = db.get(InstagramAccount, post.instagram_account_id)
        if not account:
            reply.status = "failed"
            reply.failure_reason = "account_or_token_missing"
            db.add(reply)
            db.commit()
            return {"status": "failed"}

        resolved_token = _resolve_access_token(db, account)
        if not resolved_token:
            reply.status = "failed"
            reply.failure_reason = "account_or_token_missing"
            db.add(reply)
            db.commit()
            return {"status": "failed"}

        if comment.ig_comment_id.startswith("test_"):
            reply.ig_reply_id = f"mock_{reply.id}"
            reply.status = "sent"
            reply.sent_at = datetime.now(timezone.utc)
            comment.status = "replied"
            comment.updated_at = datetime.now(timezone.utc)
            reply.updated_at = datetime.now(timezone.utc)
            db.add(reply)
            db.add(comment)
            db.commit()
            return {"status": "sent", "mode": "mock"}

        try:
            result = MetaGraphClient().send_comment_reply(
                comment_id=comment.ig_comment_id,
                message=reply.final_text,
                access_token=resolved_token,
            )
            reply.ig_reply_id = str(result.get("id", ""))
            reply.status = "sent"
            reply.sent_at = datetime.now(timezone.utc)
            comment.status = "replied"
            comment.updated_at = datetime.now(timezone.utc)
        except Exception as exc:
            import logging
            logging.error(f"Failed to send reply via Meta API: {exc}")
            reply.status = "failed"
            reply.failure_reason = str(exc)
            comment.status = "failed"
            comment.updated_at = datetime.now(timezone.utc)
            # Log failure
            db.add(AuditLog(
                company_id=reply.company_id,
                event_type="reply_failed",
                description=f"Failed to send reply to comment {reply.comment_id}: {str(exc)}",
                payload={"reply_id": str(reply.id), "error": str(exc)}
            ))

        reply.updated_at = datetime.now(timezone.utc)
        if reply.status == "sent":
            # Log success
            db.add(AuditLog(
                company_id=reply.company_id,
                event_type="reply_sent",
                description=f"Reply sent successfully to comment {reply.comment_id}.",
                payload={"reply_id": str(reply.id)}
            ))
            
        db.add(reply)
        db.add(comment)
        db.commit()
        return {"status": reply.status}
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.process_messaging_event")
def process_messaging_event(event_id: str, messaging_event: dict) -> dict[str, str]:
    db = SessionLocal()
    try:
        sender_id = messaging_event.get("sender", {}).get("id")
        recipient_id = messaging_event.get("recipient", {}).get("id")
        message_data = messaging_event.get("message", {})
        
        if not sender_id or not recipient_id or not message_data:
            return {"status": "invalid_data"}

        if "is_echo" in message_data:
            return {"status": "echo_ignored"}

        # Find account
        account = db.query(InstagramAccount).filter(InstagramAccount.ig_user_id == str(recipient_id)).first()
        if not account:
            return {"status": "account_not_found"}

        # Find or create conversation
        conv = db.query(Conversation).filter(
            Conversation.account_id == account.id,
            Conversation.ig_sid == str(sender_id)
        ).first()
        
        if not conv:
            # Fetch profile for new conversations
            participant_username = None
            try:
                from app.core.security import decrypt_token
                resolved_token = decrypt_token(account.access_token_encrypted)
                profile = MetaGraphClient().fetch_user_profile(str(sender_id), resolved_token)
                participant_username = profile.get("username")
            except Exception as e:
                import logging
                logging.warning(f"Failed to fetch profile for user {sender_id}: {e}")

            conv = Conversation(
                company_id=account.company_id,
                account_id=account.id,
                ig_sid=str(sender_id),
                participant_username=participant_username,
                status="active",
                unread_count=0
            )
            db.add(conv)
            db.flush()

        # Increment unread count
        conv.unread_count += 1
        media_url = None
        media_type = None
        attachments = message_data.get("attachments", [])
        if attachments:
            # Take the first image if present
            for att in attachments:
                if att.get("type") == "image":
                    payload_data = att.get("payload", {})
                    media_url = payload_data.get("url")
                    media_type = "image"
                    break

        # Store incoming message
        msg_text = message_data.get("text")
        incoming_msg = Message(
            conversation_id=conv.id,
            ig_mid=message_data.get("mid"),
            sender_id=str(sender_id),
            recipient_id=str(recipient_id),
            direction="inbound",
            message_text=msg_text,
            media_url=media_url,
            media_type=media_type,
            raw_payload=messaging_event,
            status="received"
        )
        db.add(incoming_msg)
        
        # Update conversation
        conv.last_message_text = msg_text or f"[{media_type or 'attachment'}]"
        conv.last_message_at = datetime.now(timezone.utc)
        
        db.commit()

        # Decide intent (optional context)
        intent = "general_interest"
        if msg_text:
            from app.services.intent_service import classify_intent
            intent, *_ = classify_intent(msg_text)

        # Trigger reply generation
        celery_app.send_task("app.workers.tasks.generate_dm_reply_task", args=[str(incoming_msg.id), intent])
        
        return {"status": "message_queued"}
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.generate_dm_reply_task")
def generate_dm_reply_task(message_id: str, intent: str) -> dict[str, str]:
    db = SessionLocal()
    try:
        msg = db.get(Message, UUID(message_id))
        if not msg or msg.direction != "inbound":
            return {"status": "invalid_message"}
        
        conv = db.get(Conversation, msg.conversation_id)
        account = db.get(InstagramAccount, conv.account_id)
        company = db.get(Company, account.company_id)

        # Get history (last 10 messages)
        history_msgs = db.query(Message).filter(
            Message.conversation_id == conv.id
        ).order_by(Message.created_at.desc()).limit(11).all() # 1 is current, 10 is history
        
        history_msgs.reverse()
        history_data = []
        for h in history_msgs:
            if h.id == msg.id: continue # skip current
            role = "user" if h.direction == "inbound" else "assistant"
            history_data.append({"role": role, "content": h.message_text or ""})

        from app.services.reply_service import generate_reply
        
        reply_text = generate_reply(
            comment_text=msg.message_text or "[Görsel Mesaj]",
            intent=intent,
            username=conv.participant_username,
            recent_replies=None, # Not used for DM exactly the same way yet
            media_url=msg.media_url, # Vision support!
            media_caption=None,
            company_instructions=company.ai_custom_instructions,
            ai_model=company.ai_model_tier,
            is_dm=True,
            conversation_history=history_data
        )

        if not reply_text:
            return {"status": "no_reply_generated"}

        # Send via Meta
        from app.integrations.meta_client import MetaGraphClient
        client = MetaGraphClient()
        
        try:
            from app.core.security import decrypt_token
            token = decrypt_token(account.access_token_encrypted)
            
            res = client.send_direct_message(
                recipient_id=msg.sender_id,
                message_text=reply_text,
                access_token=token
            )
            
            # Store outbound message
            out_msg = Message(
                conversation_id=conv.id,
                ig_mid=res.get("message_id", f"out_{uuid.uuid4()}"),
                sender_id=account.ig_user_id,
                recipient_id=msg.sender_id,
                direction="outbound",
                message_text=reply_text,
                status="sent"
            )
            db.add(out_msg)
            
            # Update conversation
            conv.last_message_text = reply_text
            conv.last_message_at = datetime.now(timezone.utc)
            db.commit()
            
            return {"status": "reply_sent", "message_id": out_msg.ig_mid}
            
        except Exception as e:
            import logging
            logging.error(f"DM Send Error: {e}")
            return {"status": "send_failed", "error": str(e)}

    finally:
        db.close()
