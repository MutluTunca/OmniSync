## Project automation commands

.PHONY: test-backend lint-backend test-frontend lint-frontend

test-backend:
	cd backend && pytest

lint-backend:
	cd backend && flake8 app

test-frontend:
	cd frontend && npm test

lint-frontend:
	cd frontend && npm run lint
