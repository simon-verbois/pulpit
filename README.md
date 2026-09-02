# Pulpit

A modern web interface for managing Pulp repositories, artifacts, users, and permissions through
the Pulp API.

## What Pulpit is

Pulp is a powerful content/repository management engine, but its default tooling isn't always the
easiest way to operate it day to day. Pulpit is a dedicated management UI for Pulp — the name is a
wordplay: Pulp is the engine, Pulpit is where you administer it from. Pulpit does not replace Pulp;
Pulp remains the entire backend and the sole source of truth. Pulpit aims to make Pulp
(pulpcore + pulp_rpm + pulp_container + pulp_ansible) significantly easier and more pleasant to
use, with a UX in the spirit of enterprise consoles like Ansible Automation Platform, Private
Automation Hub, Satellite, or the Hybrid Cloud Console — built on the open PatternFly design
system, with its own product identity (no proprietary assets, no Pulp trademarks used
misleadingly).

## Status

RPM, Containers, Ansible, and Access are real, fully wired feature sets backed by the live Pulp
API (repositories, sync, content browsing, distributions, users/groups/roles/permissions, and more
per area). Only the enterprise-hardening area (Milestone 6) remains a routed placeholder. See
[`docs/ROADMAP.md`](docs/ROADMAP.md) for exactly what's built vs. planned.

## Architecture

Pulpit's frontend is a **frontend-only** single-page application. It has no backend, database, or
auth system of its own — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and ADR 0001. The
project also includes `pulpit-core`/`pulpit-worker` (ADR 0006), a narrowly-scoped backend for
capabilities that structurally cannot live in a browser or in Pulp's API — signing key custody and
lifecycle being the first (see [`docs/signing.md`](docs/signing.md)).

```
Browser -> Pulpit SPA (React + TypeScript + PatternFly) -> Pulp REST API -> PostgreSQL (owned by Pulp)
                                                          -> pulpit-core API -> pulpit-worker -> GPG
```

Pulpit, Pulp, and pulpit-core are served from one origin behind nginx (ADR 0005); the browser only
ever calls relative URLs like `/pulp/api/v3/...` and `/pulpit-core/api/...`.

## Deploying Pulpit

Pulpit ships as a static-asset container image (nginx + built assets, no Node runtime at
runtime — see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)) and must be deployed alongside a Pulp
instance behind one same-origin reverse proxy. The bundled `compose.yml` is the current reference
deployment topology (Pulp + Pulpit + pulpit-core on one Docker host).

### Prerequisites

- Docker + Docker Compose v2
- A reachable Pulp instance — the bundled `compose.yml` runs one for you, or point Pulpit at an
  existing Pulp deployment (see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md))

### Quick start

```sh
git clone https://github.com/simon-verbois/pulpit.git
cd pulpit
cp .env.example .env
openssl rand -hex 32   # paste the result into .env as PULP_SECRET_KEY
openssl rand -hex 32   # paste the result into .env as PULPIT_CORE_DB_PASSWORD
docker compose up -d --build
```

Open `http://localhost:8080/` and log in. Pulp's all-in-one image creates an `admin` account with
a random password on first boot; either set `PULP_ADMIN_PASSWORD` in `.env` _before_ first bringing
the stack up (so you have a known password to log in with), or run `make pulp-reset-admin`
afterwards — see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Configuration

All configuration is environment-driven — see [`.env.example`](.env.example) for the full,
documented list. Key points:

- Any `VITE_*` variable is compiled into the public JS bundle at build time — never put a secret
  in one.
- `PULP_SECRET_KEY` and `PULPIT_CORE_DB_PASSWORD` must be real generated secrets in a local,
  untracked `.env` — never commit real values.
- `PULPIT_PUBLIC_ORIGIN` must match the public URL Pulpit is actually served on, or logins will
  work but every subsequent action (including logout) will 403 — see
  [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) "CSRF_TRUSTED_ORIGINS".

### Production considerations

The bundled Compose stack is the current reference topology, not a hardened production deployment.
Before exposing Pulpit beyond a trusted network, see
[`docs/SECURITY.md`](docs/SECURITY.md) and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) "Production
(future work)" for what's still missing (TLS termination, secrets-manager-backed secrets, hardened
security headers) and what's already true today. Notably, the container registry
(`/v2/`) currently runs with `PULP_TOKEN_AUTH_DISABLED`, which is not safe to carry into a
production deployment — see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) "Container registry
authentication".

### Developing Pulpit

For fast frontend-only iteration and the full contributor workflow (lint/typecheck/test/build,
`make help`), see [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

## Primary capabilities

- RPM/YUM: repositories, packages, remotes, sync, publications/distributions, repository
  versions, package upload.
- Container/OCI: repositories, manifests/tags, remotes, sync, distributions, copyable
  `podman`/`docker` commands.
- Ansible/Galaxy: namespaces, collections, collection versions, repositories, remotes, import/sync.
- Pulpcore: tasks, workers, system status, users/groups/roles, signing services, content guards.
- Repository/package signing key management (GPG key generation, rotation, public key
  distribution) via `pulpit-core` — see [`docs/signing.md`](docs/signing.md).

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for current implementation status per area.

## Technology stack

React, TypeScript (strict), Vite, PatternFly, React Router, TanStack Query, `openapi-typescript`
(schema → types, ADR 0004), Vitest + React Testing Library, Playwright, ESLint, Prettier. See
[`docs/adr/`](docs/adr/) for why each was chosen, and `package.json`/`pulpit-core/pyproject.toml`
for exact pinned versions.

## Project structure

```
pulpit/
├── docs/                  # architecture, API, auth, RBAC, UX, testing, security, roadmap, ADRs
├── docker/nginx/          # reverse-proxy config (same-origin, ADR 0005)
├── Dockerfile             # multi-stage: Node build -> nginx static (no Node at runtime)
├── compose.yml            # reference Pulp + Pulpit(+pulpit-core) deployment
├── e2e/                   # Playwright specs
├── scripts/api/           # OpenAPI schema fetch + type generation
├── pulpit-core/           # Pulpit's own backend (ADR 0006) - see docs/signing.md
│   ├── app/               # FastAPI app: core/ (jobs, events, db), adapters/pulp/, modules/signing/
│   ├── worker/            # pulpit-worker entrypoint (the only process with GPG key access)
│   ├── migrations/        # Alembic
│   └── signing-scripts/   # generic GPG signing scripts pulpit-worker publishes for Pulp to run
└── src/
    ├── app/               # App shell, router, layout (masthead/nav/breadcrumbs)
    ├── api/                # client, generated types, errors, tasks (ADR 0004)
    ├── components/        # genuinely shared components (PageHeader, *State, ...)
    ├── features/          # one subtree per product area (overview, rpm, containers, ansible, ...)
    ├── hooks/, lib/       # shared hooks/utilities
    └── test/              # Vitest setup, MSW handlers
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design
- [`docs/PULP_API.md`](docs/PULP_API.md) — Pulp API integration strategy
- [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md) / [`docs/RBAC.md`](docs/RBAC.md) — auth/permissions model
- [`docs/UX.md`](docs/UX.md) — UI/UX conventions
- [`docs/TESTING.md`](docs/TESTING.md) — testing strategy
- [`docs/SECURITY.md`](docs/SECURITY.md) — security posture
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) / [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — running it
- [`docs/signing.md`](docs/signing.md) — repository/package signing (pulpit-core, ADR 0006)
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — milestones and current status
- [`docs/adr/`](docs/adr/) — architecture decision records

## Current limitations

- Content guards UI (Milestone 6) isn't built yet; it remains a routed placeholder
  ([`docs/ROADMAP.md`](docs/ROADMAP.md)). Repository/package signing key management is now
  implemented via `pulpit-core` — see [`docs/signing.md`](docs/signing.md) for what it does and
  does not cover (e.g. no bulk re-signing of already-synced packages).
- The OpenAPI type-generation pipeline (`make api-fetch` / `make api-generate`) is implemented but
  generates an unfiltered combined schema; per-plugin schema splitting is not yet verified.
- The container registry (`/v2/`) works end-to-end in this reference stack, including a real
  `podman pull` — but via `PULP_TOKEN_AUTH_DISABLED` rather than a real signing keypair, which is
  not safe to carry into a production deployment (see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
  "Container registry authentication").
- Login works against Pulp's own accounts (session-cookie auth,
  [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md)) only; LDAP/SSO/reverse-proxy auth are
  architecturally supported but unconfigured and unexercised in this environment
  ([`docs/ROADMAP.md`](docs/ROADMAP.md) Milestone 6).
- No production deployment hardening (TLS, secrets management, security headers) is implemented
  yet beyond what's documented in [`docs/SECURITY.md`](docs/SECURITY.md)/
  [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) as future work.

## Versioning

Pulpit uses calendar-based release versions, tracked in the [`VERSION`](VERSION) file at the
repository root and shown at the bottom of the app. Each container image is built from a tagged
release matching that file.

## Contributing

No formal contribution process yet — this is an early-stage project. See
[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) and the documentation above when making changes.

## License

[MIT](LICENSE) — Copyright (c) 2026 Simon Verbois.

## Credits

Pulpit's product mark (`public/pulpit-mark.svg`) is built on the **cil-layers** icon from
[CoreUI Icons](https://github.com/coreui/coreui-icons), licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (icon artwork). The icon is unmodified;
the surrounding badge/color composition is original to Pulpit. See
[`docs/UX.md`](docs/UX.md) "Product mark".
