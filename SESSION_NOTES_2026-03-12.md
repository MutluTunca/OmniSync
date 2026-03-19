# OmniSync Emlak - Session Notes (2026-03-12)

## What we completed

1. Fixed race condition in worker flow for new comments.
   - File: `backend/app/workers/tasks.py`
   - Change: intent analysis tasks are queued after DB commit.

2. Fixed frontend API base URL mismatch in Docker setup.
   - File: `infra/docker/docker-compose.yml`
   - Change: frontend now uses `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`.

3. Added post context to comments API and UI.
   - File: `backend/app/api/v1/endpoints/comments.py`
   - File: `frontend/src/app/comments/page.tsx`
   - Result: each comment now shows which post/media it belongs to.

4. Added filtering/search/pagination for high comment volume.
   - File: `frontend/src/app/comments/page.tsx`
   - File: `frontend/src/app/styles.css`
   - Added:
     - Quick tabs: all, action required, today, replied, sensitive
     - Filters: text search, status, intent, reply yes/no, date
     - Pagination + page size

5. Set default opening view to "Action Required".
   - File: `frontend/src/app/comments/page.tsx`

## SaaS transition plan (agreed)

### Phase 1 - Stable MVP (1-2 weeks)
- Enforce token refresh job (hourly + pre-expiry)
- Add health checks for webhook/worker/queue
- Add alerts for token refresh failures and queue backlog

### Phase 2 - Managed Staging (1 week)
- CI/CD deploy for backend/worker/beat/frontend
- Managed Postgres + Redis
- Secret manager and fixed HTTPS callback URLs

### Phase 3 - Multi-tenant core (2-3 weeks)
- Strict tenant scoping by `company_id`
- Roles: owner/manager/operator
- Multiple IG accounts per company
- Plan/rate limits

### Phase 4 - SaaS UX + ops (2 weeks)
- One-click connect/reconnect in panel
- Token status UI
- Saved views and operational audit logs

### Phase 5 - Billing + hardening (2 weeks)
- Subscription plans + trial + limit enforcement
- Retry policies + DLQ
- Backup/restore and security hardening

## Next recommended execution order

1. Token refresh job + token health endpoint/UI
2. Monitoring + alerting for webhook/worker/queue
3. CI/CD to staging
4. One-click reconnect UX

## How to continue next time

When you reopen, say:

"Continue from `SESSION_NOTES_2026-03-12.md` and start with item 1 in next recommended execution order."

## Progress update (2026-03-13)

Started item 1: token refresh job + token health endpoint/UI.

Completed:
- Added periodic token refresh task in Celery.
  - File: `backend/app/workers/tasks.py`
  - Task: `app.workers.tasks.refresh_instagram_tokens`
  - Behavior: refreshes active account tokens when missing expiry or near expiry threshold.

- Added beat schedule for token refresh.
  - File: `backend/app/workers/celery_app.py`
  - Runs every `token_refresh_interval_sec` (default 3600 sec).

- Added Meta Graph token refresh client call.
  - File: `backend/app/integrations/meta_client.py`

- Added token health API + manual refresh trigger API.
  - File: `backend/app/api/v1/endpoints/instagram.py`
  - New endpoints:
    - `GET /api/v1/instagram/token-health`
    - `POST /api/v1/instagram/refresh-tokens-now`

- Added token health dashboard UI card.
  - File: `frontend/src/app/page.tsx`
  - Shows summary counts (active, expiring soon, expired, unknown, missing).

- Added new config values.
  - File: `backend/app/core/config.py`
  - `token_refresh_interval_sec`
  - `token_refresh_threshold_hours`
  - `token_assumed_expiry_days`

- Added internal backend URL for server-side frontend fetches.
  - File: `infra/docker/docker-compose.yml`
  - `INTERNAL_API_BASE_URL=http://backend:8000`

Verification notes:
- `GET /api/v1/instagram/token-health` returns summary + account rows.
- `POST /api/v1/instagram/refresh-tokens-now` queues Celery task successfully.
- Current production-like token refresh call returned Graph API 400 for existing token, so account appears as `unknown` and needs reconnect/new valid token.

Reconnect UX added:
- Dashboard now highlights active accounts needing reconnect and provides link.
  - File: `frontend/src/app/page.tsx`
- Added dedicated reconnect page with one-click OAuth start.
  - File: `frontend/src/app/instagram/connect/page.tsx`

Reconnect hardening:
- OAuth callback now auto-activates reconnected accounts and ensures token expiry is set.
  - File: `backend/app/api/v1/endpoints/instagram.py`
- OAuth callback now redirects back to frontend reconnect page with success state.
  - File: `backend/app/api/v1/endpoints/instagram.py`

Multi-account + shared token improvements:
- Added company-level shared Meta token storage (one integration token can serve many IG accounts).
  - File: `backend/app/models/company.py`
  - Migration: `backend/alembic/versions/0003_company_meta_token.py`
- Token health now reports integration-level health and flags per-account `requires_reconnect`.
  - File: `backend/app/api/v1/endpoints/instagram.py`
- Polling/reply flows now prefer company shared token, with account-token fallback.
  - File: `backend/app/workers/tasks.py`
- Token refresh job now refreshes per company (not per IG account) and syncs token back to account rows.
  - File: `backend/app/workers/tasks.py`

Monitoring endpoints added (item 2 started):
- Added Celery monitoring endpoint.
  - `GET /api/v1/monitoring/celery`
  - File: `backend/app/api/v1/endpoints/monitoring.py`
- Added webhook monitoring endpoint.
  - `GET /api/v1/monitoring/webhooks`
  - File: `backend/app/api/v1/endpoints/monitoring.py`
- Added manual alerts trigger endpoint.
  - `POST /api/v1/monitoring/alerts-now`
  - File: `backend/app/api/v1/endpoints/monitoring.py`
- Wired monitoring router into v1 API router.
  - File: `backend/app/api/v1/router.py`
  
## CI/CD Progress (item 3 started)
- Extended CI workflow to build Docker images and push to registry.
  - File: `.github/workflows/ci.yml`
  - Job: `docker_build`

Next todos in progress:
4. One-click reconnect UX (completed)
   - Implement Instagram accounts management page with reconnect buttons
   - Files: `frontend/src/app/instagram/accounts/page.tsx`, `frontend/src/app/page.tsx`
5. Roles & Permissions (in progress)
   - Added Role enum, dependencies, and `/users` admin APIs
   - Dashboard now shows “Kullanıcılar” card and `/users` page consumes access token

Note:
- Runtime verification pending because local Docker daemon was unavailable during last check.
