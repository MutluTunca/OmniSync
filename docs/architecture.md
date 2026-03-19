# Architecture (MVP)

- FastAPI receives Meta webhook events and stores them in Postgres.
- Webhook event IDs are enqueued to Celery.
- Workers process events asynchronously to avoid blocking webhook response time.
- JWT auth with role and company scope.
- Next.js dashboard calls API endpoints for comments, replies, and analytics.
