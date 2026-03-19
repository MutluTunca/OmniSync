# OmniSync Instagram Auto-Reply SaaS (MVP Day-1)

Production-oriented monorepo scaffold for OmniSync real-estate Instagram automation.

## Stack
- Backend: FastAPI + SQLAlchemy + Alembic
- Queue: Celery + Redis
- DB: PostgreSQL
- Frontend: Next.js
- AI: OpenAI integration placeholders

## Project Structure
- `backend/`: API, auth, webhook ingestion, workers
- `frontend/`: Next.js dashboard shell
- `infra/docker/docker-compose.yml`: local runtime
- `docs/`: architecture and prompt notes

## Quick Start
1. Copy `.env.example` to `.env`.
2. Run:
   - `docker compose -f infra/docker/docker-compose.yml up --build`
3. Open:
   - API docs: `http://localhost:8000/docs`
   - Frontend: `http://localhost:3000`

## Day-1 Implemented
- Health endpoint: `GET /api/v1/healthz`
- Auth login/refresh: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`
- Instagram OAuth start/callback stubs
- Meta webhook verify + ingestion endpoint
- Celery worker task for queued webhook events
- Polling mode worker (Instagram media/comments pull)
- Base data model and initial Alembic migration

## Polling Mode (No Webhook Capability)
When Meta advanced access is not available yet, you can connect accounts manually and poll comments.

1. Connect account manually:
   - `POST /api/v1/instagram/manual-connect`
2. Trigger poll now:
   - `POST /api/v1/instagram/poll-now`
3. Check comments:
   - `GET /api/v1/comments`

## Notes
- OAuth token exchange and Graph API sync are scaffolded for next sprint.
- OpenAI service wrapper is ready for intent/extraction/reply modules.
