# ADR 0001: Pulpit is a frontend-only application

## Status

Partially superseded by ADR 0006. The `pulpit` frontend container and everything below "Decision"
still holds exactly as written - it remains a static SPA with no database, auth store, or GPG
access of its own. What no longer holds project-wide is the closing sentence ("no server-side logic
of any kind... ever"): `pulpit-core`/`pulpit-worker` are a deliberately separate, narrowly-scoped
backend introduced for signing key custody (a capability that structurally cannot live in a
browser - see ADR 0006 "Context"). Read this ADR for why frontend-only was the right default, and
ADR 0006 for exactly what changed and why.

## Context

Pulp already owns repositories, content, remotes, sync, distributions, tasks, users, groups,
roles, and permissions, backed by its own PostgreSQL database and async task workers. Pulpit's
job is to make that easier to operate, not to become a second system of record.

A tempting shortcut when building an admin UI is to add "just a small" backend: a BFF to reshape
API responses, a session store, a cache, a proxy with business logic. Each of these creates a
second source of truth, a second thing to deploy/patch/secure, and a second place where Pulp's
semantics (repository versioning, task state, object permissions) can drift out of sync with
reality.

## Decision

Pulpit is a static single-page application: React + TypeScript + PatternFly, built to static
assets, served by nginx. It talks to Pulp's REST API directly, over the same origin. It has:

- No Node.js application server at runtime (build-time Node only).
- No database of its own (no Postgres, SQLite, Redis).
- No custom authentication/authorization store.
- No server-side business logic of any kind.

The only state Pulpit keeps outside of Pulp is ephemeral, browser-local UI state: table
filters/pagination, form drafts, UI preferences, and the TanStack Query cache (which mirrors,
not replaces, Pulp's data).

## Alternatives considered

- **BFF (backend-for-frontend) proxy**: would let us reshape/aggregate Pulp responses, but
  introduces a second deployable, a second auth boundary to secure, and a strong temptation to
  accumulate business logic outside Pulp. Rejected.
- **Next.js/Remix server-rendered app**: server rendering has no clear benefit for an
  authenticated internal admin console, and both frameworks encourage a server runtime we
  explicitly don't want. Rejected.
- **Pulpit-owned RBAC/session layer**: would drift from Pulp's actual permission model and
  create a second identity system to keep in sync. Rejected — see `docs/RBAC.md`.

## Consequences

- Every feature must map to something Pulp's API actually supports; features Pulp can't do yet
  are out of scope until Pulp supports them (or are flagged as a Pulp feature request).
- Authentication is whatever Pulp/the reverse proxy in front of it supports (see
  `docs/AUTHENTICATION.md`) — Pulpit adapts to that, it does not define its own scheme.
- Deployment is simple: build static assets, serve them with nginx, reverse-proxy Pulp's API on
  the same origin (ADR 0005). No app server process to keep alive, patch, or scale.
- Anything that looks like it needs server-side logic is a signal to either find the right Pulp
  API, request the capability from Pulp, or explicitly reconsider (and document) this ADR — not
  to quietly add a backend.
