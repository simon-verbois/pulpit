.PHONY: help install dev build lint lint-fix format format-check typecheck test test-watch test-e2e check \
	env-init compose-up compose-down compose-build compose-logs \
	pulp-status pulp-versions pulp-migrations pulp-migrate pulp-reset-admin pulp-reset-hard \
	api-fetch api-generate \
	pulpit-core-install pulpit-core-test pulpit-core-migrate pulpit-logs \
	pulpit-signing-exec

PULPIT_HTTP_PORT ?= 8080

help: ## Show this help
	@echo "Pulpit developer commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

## --- Frontend -------------------------------------------------------------

install: ## Install frontend dependencies (npm ci)
	npm ci

dev: ## Run the Vite dev server (Mode A - see docs/DEVELOPMENT.md)
	npm run dev

build: ## Production build of the static frontend
	npm run build

lint: ## Run ESLint
	npm run lint

lint-fix: ## Run ESLint with --fix
	npm run lint:fix

format: ## Run Prettier (write)
	npm run format

format-check: ## Run Prettier (check only)
	npm run format:check

typecheck: ## Run the TypeScript compiler in noEmit mode
	npm run typecheck

test: ## Run unit/component tests (Vitest)
	npm run test

test-watch: ## Run Vitest in watch mode
	npm run test:watch

test-e2e: ## Run Playwright end-to-end tests against a running stack
	npm run test:e2e

check: format-check lint typecheck test build ## Full quality gate: format + lint + typecheck + test + build

## --- Docker Compose ---------------------------------------------------------

env-init: ## Generate a local .env with fresh secrets (refuses to overwrite an existing one)
	./deployment/docker/generate-env.sh

# deployment/docker/compose-dev.yml (not compose.yml) - it builds `pulpit`
# from local source instead of pulling the published image, see that
# file's header comment and docs/DEVELOPMENT.md "Mode B". --env-file .env
# is required so `.env` (at the repo root, this Makefile's own directory)
# is found - see compose-dev.yml's own header comment for why.
COMPOSE_DEV := docker compose -f deployment/docker/compose-dev.yml --env-file .env

compose-up: ## Start the full Pulp + Pulpit stack, built from local source
	$(COMPOSE_DEV) up -d --build

compose-down: ## Stop the stack (volumes are preserved)
	$(COMPOSE_DEV) down

compose-build: ## Rebuild the Pulpit image
	$(COMPOSE_DEV) build pulpit

compose-logs: ## Tail logs for all services
	$(COMPOSE_DEV) logs -f

## --- Pulp operations --------------------------------------------------------

pulp-status: ## Curl the Pulp status endpoint through the Pulpit proxy
	curl -sf http://localhost:$(PULPIT_HTTP_PORT)/pulp/api/v3/status/ | python3 -m json.tool

pulp-versions: ## Show component versions reported by the status endpoint
	curl -sf http://localhost:$(PULPIT_HTTP_PORT)/pulp/api/v3/status/ | python3 -c "import json,sys; [print(v['component'], v['version']) for v in json.load(sys.stdin).get('versions', [])]"

pulp-migrations: ## Show pending Django migrations inside the pulp container
	$(COMPOSE_DEV) exec pulp pulpcore-manager showmigrations

pulp-migrate: ## Apply pending Django migrations (see docs/DEPLOYMENT.md known issue)
	$(COMPOSE_DEV) exec pulp pulpcore-manager migrate --noinput

pulp-reset-admin: ## Reset the local Pulp admin password
	$(COMPOSE_DEV) exec pulp pulpcore-manager reset-admin-password

pulp-reset-hard: ## DESTRUCTIVE: wipe all local Pulp data and restart clean
	$(COMPOSE_DEV) down -v
	$(COMPOSE_DEV) up -d --build

## --- API type generation ----------------------------------------------------

api-fetch: ## Fetch the live Pulp OpenAPI schema (requires a reachable Pulp)
	npm run api:fetch

api-generate: ## Generate TypeScript types from the fetched schema
	npm run api:generate

## --- pulpit-core / signing (ADR 0006, docs/signing.md) ----------------------

pulpit-core-install: ## Install pulpit-core's Python dependencies into pulpit-core/.venv
	cd pulpit-core && python3 -m venv .venv && . .venv/bin/activate && pip install -e ../deployment/docker/pulp/global-network -e ".[dev]"

pulpit-core-test: ## Run pulpit-core's pytest suite (defaults to a real Postgres at localhost:15432 - set PULPIT_CORE_DATABASE_URL=sqlite:///... to use SQLite instead, see tests/conftest.py)
	cd pulpit-core && . .venv/bin/activate && pytest

pulpit-core-migrate: ## Apply pulpit-core's own Alembic migrations inside the running container
	$(COMPOSE_DEV) exec pulpit alembic upgrade head

pulpit-logs: ## Tail pulpit (nginx + API + job queue worker, docs/adr/0007-merged-pulpit-container.md) logs
	$(COMPOSE_DEV) logs -f pulpit

pulpit-signing-exec: ## Run a pulpcore-manager command shown by the Signing GUI (usage: make pulpit-signing-exec CMD="add-signing-service ...")
	$(COMPOSE_DEV) exec pulp pulpcore-manager $(CMD)
