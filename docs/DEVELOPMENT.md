# Development

## Prerequisites

- Node.js 22 (see `.nvmrc`) and npm.
- Docker + Docker Compose v2 (`docker compose ...`, not the standalone `docker-compose` binary).

## Two Compose files

`compose.yml` is the reference _deployment_ file: its `pulpit` service (nginx + pulpit-core +
pulpit-worker merged into one image, ADR 0007) pulls its published `simonverbois/pulpit` image
from Docker Hub, built by the release workflow, same as a real user deploying Pulpit would.
`compose-dev.yml` is otherwise identical but builds it from local source instead — use it, not
`compose.yml`, for everything below so you're actually testing your changes. `compose-dev.yml`
also builds `pulp` from local source (`deployment/docker/pulp/Dockerfile`, ADR 0008), so a change
to the colocated signing-service reconciler is picked up the same way. Both files define `redis`
identically.

## Two development modes

### Mode A — fast frontend iteration (recommended for UI work)

Terminal 1: Pulp backend only, via Compose. `compose-dev.yml` publishes the `pulp` service's own
port as `PULP_HTTP_PORT` (default `8180`, see `.env.example`) specifically so the Vite dev server
below can reach it directly — this is a local dev convenience and is not used by the full-stack
workflow (Mode B), where `pulp`'s port isn't published to the host at all.

```sh
./deployment/docker/generate-env.sh   # first time only - generates .env with fresh secrets
docker compose -f deployment/docker/compose-dev.yml --env-file .env up -d pulp
```

Terminal 2: Vite dev server, proxying Pulp paths so the frontend still runs same-origin from the
browser's point of view (no CORS needed) — see `vite.config.ts`'s `server.proxy` for `/pulp` and
`/v2`, pointed at `http://localhost:${PULP_HTTP_PORT}`.

```sh
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

### Mode B — full production-like stack

Everything (Pulpit built to static assets, served by nginx, same nginx also proxying Pulp) via
Compose, built from local source — see `docs/DEPLOYMENT.md` for the full walkthrough (written
against `compose.yml`'s published-image variant, but the topology and env vars are the same).

```sh
./deployment/docker/generate-env.sh   # skip if you already have a .env from Mode A
./start-pulpit.sh
```

Open `http://localhost:8080/` (or `$PULPIT_HTTP_PORT`).

`start-pulpit.sh` stops any running development stack before rebuilding and starting it, so its
default behavior is a clean restart while preserving local data. Use `./start-pulpit.sh --reset`
to also delete the Compose volumes and create a completely fresh local instance. This permanently
deletes the local Pulp and Pulpit data. Run `./stop-pulpit.sh` to stop the stack while preserving
its volumes.

## Everyday commands

See `make help` for the full list; the important ones:

```sh
make install       # npm ci
make dev           # npm run dev (Mode A frontend)
make build         # production build
make lint          # eslint
make typecheck     # tsc --noEmit
make test          # vitest run
make test-e2e      # playwright test (expects a reachable app; see docs/TESTING.md)
make check         # lint + typecheck + test + build — the full quality gate
make compose-up / compose-down / compose-build / compose-logs
./start-pulpit.sh [--reset] / ./stop-pulpit.sh
make pulp-status / pulp-versions / pulp-migrations / pulp-migrate / pulp-reset-admin
make api-fetch / api-generate
```

## Regenerating API types

Requires a reachable Pulp instance (typically `docker compose -f deployment/docker/compose-dev.yml --env-file .env up -d pulp`, or
Mode A):

```sh
make api-fetch      # fetch the live OpenAPI schema(s)
make api-generate    # openapi-typescript -> src/api/generated/
```

See ADR 0004 and `docs/PULP_API.md` for what this pipeline does and does not attempt.

## Resetting the Pulp admin password

```sh
make pulp-reset-admin
```

Runs `docker compose -f deployment/docker/compose-dev.yml --env-file .env exec pulp pulpcore-manager reset-admin-password` — a real
pulpcore management command, not something Pulpit invents.

## Observability / troubleshooting

**Frontend**: browser devtools console + network tab; Vite's terminal output for build/dev-server
errors.

**Pulp**: `docker compose -f deployment/docker/compose-dev.yml --env-file .env logs pulp` (or `make compose-logs`), `make
pulp-status`, `make pulp-migrations`, `make pulp-versions` (component versions from the status
endpoint).

**Proxy**: `docker compose -f deployment/docker/compose-dev.yml --env-file .env logs pulpit` for nginx access/error logs; `curl` the
public endpoint directly to isolate "is this a Pulp problem or an nginx routing problem" (see
`docs/DEPLOYMENT.md` acceptance checks).

| Symptom                                      | Check                                                                                                                                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `502` on `/pulp/api/v3/status/`              | `make pulp-status`; `make pulp-migrations` (pending migrations are a known cause — see `docs/DEPLOYMENT.md`); `docker compose -f deployment/docker/compose-dev.yml --env-file .env logs pulp` |
| A plugin (e.g. pulp_container) seems missing | `make pulp-versions` — confirm it's actually reported by the status endpoint before assuming a bug                                                                                            |
| UI loads but API calls get `401`             | Check you're actually authenticated against Pulp for this session/request — see `docs/AUTHENTICATION.md`                                                                                      |
| `404`/`502` on `/v2/` or `/pulp/content/`    | nginx routing issue, not expected — check `deployment/docker/nginx/pulpit.conf.template` and `docker compose -f deployment/docker/compose-dev.yml --env-file .env logs pulpit`                |
| `/ui/` returns something other than `404`    | nginx routing regression — it must not expose pulp-ui (ADR 0005)                                                                                                                              |

## Project structure

See `docs/ARCHITECTURE.md` for the API layer layout and the tree in the root `README.md` for the
full repository/frontend layout.
