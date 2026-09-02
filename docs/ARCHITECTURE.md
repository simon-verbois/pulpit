# Architecture

Pulpit's frontend (`pulpit`) is a static single-page application with no backend of its own — see
ADR 0001. As of ADR 0006, the wider Pulpit _project_ also includes `pulpit-core`/`pulpit-worker`, a
narrowly-scoped backend for capabilities Pulp's API and a browser cannot host between them —
signing key custody being the first. This document explains the shape of the whole system and
where responsibility lives; see `docs/signing.md` for the signing module specifically.

## Topology

```mermaid
flowchart TB
    Browser -->|HTTPS, same origin| Nginx
    subgraph Pulpit Host
        Nginx -->|"/ (static files)"| SPA[Pulpit static assets]
        Nginx -->|"/pulp/api/*"| Pulp
        Nginx -->|"/pulp/content/*"| Pulp
        Nginx -->|"/v2/*"| Pulp
        Nginx -->|"/pulpit-core/api/*"| PulpitCore[pulpit-core API]
        Nginx -->|"/keys/*"| PulpitCore
        Nginx -->|"/ui/*"| NotFound["404 (legacy pulp-ui hidden)"]
    end
    subgraph Pulp
        Pulpcore
        pulp_rpm
        pulp_container
        pulp_ansible
        Pulpcore --> Postgres[(PostgreSQL, owned by Pulp)]
    end
    subgraph "pulpit-core (ADR 0006)"
        PulpitCore --> PulpitCoreDB[(PostgreSQL, owned by pulpit-core)]
        PulpitCore -.->|jobs, same DB| PulpitWorker[pulpit-worker]
        PulpitWorker -->|GPG| GnuPGHome[(GNUPGHOME volume)]
        PulpitWorker -->|"admin API calls"| Pulp
        PulpitWorker -.->|"optional: scoped exec"| DockerProxy[docker-socket-proxy]
    end
    PulpitWorker -.->|"shared GNUPGHOME + scripts volumes"| Pulp
    DockerProxy -.->|"CONTAINERS + EXEC only"| Pulp
```

Everything in this diagram runs as containers in the Compose dev environment; in production
`pulp` is whatever Pulp deployment the operator already runs, and `pulpit`/`pulpit-core`/
`pulpit-worker` are deployed alongside it, all fronted by the same nginx routing rules. See ADR
0005, ADR 0006, and `docs/DEPLOYMENT.md`.

## pulpit-core and pulpit-worker (ADR 0006)

- **pulpit-core** is a FastAPI service with its own PostgreSQL database. It exposes a versioned,
  authenticated module API (`/pulpit-core/api/v1/<module>/...`) plus any module's opted-in
  unauthenticated routes (signing's public key endpoint, `/keys/...`). It validates the caller's
  existing Pulp session the same way the frontend does (`GET /pulp/api/v3/login/`) — no separate
  identity store.
- **pulpit-worker** runs the same codebase's background job queue and the signing module's
  rotation-check scheduler. It is the only process with GPG key material's volume mounted —
  pulpit-core's API process never has that access, by construction (`docs/signing.md`). It can
  optionally also reach a scoped `docker-socket-proxy` (Docker Engine API restricted to
  `CONTAINERS`+`EXEC`, never the raw socket) to automate the one Pulp-side administrative command
  signing needs — opt-in, falls back to a manual command otherwise (`docs/signing.md` "Automating
  the manual Pulp step", ADR 0006 "Alternatives considered").
- Structure (`pulpit-core/app/`):
  ```
  app/
    api/            # health check, router aggregation
    core/
      config/       # settings (env-var driven, all signing identity defaults overridable)
      database/     # SQLAlchemy session/base
      events/       # in-process pub/sub + durable events_log table
      jobs/         # generic Postgres-backed job queue (module-agnostic)
    adapters/
      pulp/         # the only place that constructs a Pulp request (mirrors src/api/client/)
    modules/
      signing/      # first module - see docs/signing.md
  worker/           # pulpit-worker's entrypoint
  migrations/       # Alembic
  ```
- A module owns its routes, models, jobs, and domain logic; it never reaches into another module's
  internals, and cross-module notification goes through the event bus, not direct calls — the
  seam a second module (validation, notifications, scheduled maintenance, ...) would use later
  without touching the signing module at all.

## Responsibilities

**Pulp** (unchanged, out of Pulpit's scope):

- All persistent state: repositories, repository versions, content, remotes, distributions,
  publications, tasks, users, groups, roles, permissions.
- All authentication and authorization decisions.
- All async work (sync, publish, import) via its task system.
- Its own PostgreSQL database — Pulpit never talks to a database directly.

**Pulpit**:

- Renders Pulp's data using PatternFly, in a navigation structure organized by product area
  (RPM / Containers / Ansible / Access / Administration — see `docs/UX.md`).
- Calls Pulp's REST API directly (relative, same-origin URLs only).
- Tracks async Pulp tasks and reflects their state (waiting/running/completed/failed/canceled) —
  see "Tasks" below and the `pulp-tasks` skill.
- Normalizes Pulp API errors into a consistent, distinguishable set of UI states (unauthenticated,
  forbidden, not found, validation, conflict, backend unavailable, task failure, network failure)
  — see `docs/PULP_API.md`.
- Detects which plugins/components are actually installed via the status endpoint and adapts the
  UI instead of assuming a fixed plugin set (see "Capability detection" below).
- Holds ephemeral, browser-local UI state only (filters, pagination, form drafts, TanStack Query
  cache).

## API client layer

```
src/api/
├── generated/          # openapi-typescript output, never hand-edited (ADR 0004)
│   ├── core/
│   ├── rpm/
│   ├── container/
│   └── ansible/
├── client/             # hand-written typed adapters + the fetch wrapper
├── errors/             # Pulp error -> normalized UI error shape
└── tasks/              # task href tracking / polling abstraction
```

Feature code (`src/features/<domain>/`) calls typed adapters in `src/api/client/`, wrapped in
TanStack Query hooks (ADR 0003). Nothing outside `src/api/` constructs a Pulp URL by hand.

## Authentication boundary

Pulpit never implements login, session storage, or RBAC itself — see `docs/AUTHENTICATION.md`
and `docs/RBAC.md`. It reacts to what Pulp's API tells it (401/403, current-user/permission
information where available) and lets the deployment's actual auth mechanism (Pulp native auth,
reverse-proxy auth, external SSO) do the work.

## Tasks as a first-class concept

Many Pulp operations (sync, publish, import) return a task href instead of completing inline.
Pulpit tracks these through a shared abstraction (`src/api/tasks`) rather than each feature
re-implementing polling:

```
mutation (e.g. "sync repository")
      |
      v
Pulp returns a task href
      |
      v
useTask(href) polls task status
      |
      +--> waiting / running -> reflected in the masthead task drawer
      +--> completed          -> invalidate affected TanStack Query keys
      +--> failed / canceled  -> surface failure detail, do not fake progress
```

Only fields Pulp's task API actually returns are shown (no fabricated progress percentages). See
the `pulp-tasks` skill.

## Capability detection

Not every Pulp deployment has every plugin installed. Pulpit derives a small capability map
(`src/api/capabilities.ts`) from the `/pulp/api/v3/status/` response's reported components (e.g.
`capabilities.rpm`, `capabilities.container`, `capabilities.ansible`), never hardcoded to `true`.
`AppNav` (`src/app/layout/AppNav.tsx`) uses it to hide a plugin's entire nav group when that
plugin isn't installed, instead of leaving a dead nav section whose every page would just 404 -
failing open (showing every group) while status is still loading or unavailable, so a transient
status problem never hides real navigation (docs/ROADMAP.md "API/version-compatibility
handling").

## Build/runtime architecture

- **Build time**: Node.js + Vite compiles TypeScript/React/PatternFly into static assets
  (`dist/`). This is the only place Node.js runs.
- **Runtime**: nginx serves those static assets and reverse-proxies Pulp's API/content/registry
  paths on the same origin. There is no Node process at runtime — see the `Dockerfile`.

## No database, no GPG access in the `pulpit` frontend container

Worth stating plainly since it's easy to accidentally reintroduce: the `pulpit` container image
and its Compose service run **only** nginx + static files. There is no Postgres/SQLite/Redis
service, and no GPG/signing key access, that belongs to the `pulpit` container, and there must
never be one. All _Pulp_ persistence is Pulp's; the `pulpit-core-db` database (ADR 0006) belongs
to `pulpit-core` alone and is never read from the frontend.

`compose.yml`'s `redis` service is not an exception to this: it's Pulp's own optional HTTP
response cache (`PULP_CACHE_ENABLED` on the `pulp` service — see `docs/DEPLOYMENT.md` "Redis"),
configured and consumed entirely by pulpcore. Neither Pulpit's frontend nor pulpit-core talks to
it directly (pulpit-core's jobs are Postgres-backed — ADR 0006).
