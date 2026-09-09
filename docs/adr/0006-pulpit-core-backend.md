# ADR 0006: Introduce pulpit-core, a Pulpit-owned backend, starting with signing

## Status

Accepted. Supersedes ADR 0001 ("Pulpit is a frontend-only application") for the scope described
below; ADR 0001's reasoning still fully applies to the `pulpit` frontend container itself.

## Context

ADR 0001 established a hard rule: Pulpit has no server-side component, no database, no business
logic beyond Pulp's own API.
That rule bought real value - one system of record, one deployable to secure, no drift between a
shadow model and Pulp's actual state.

Repository/package signing key management does not fit inside that rule, for reasons that are not
workarounds but properties of the problem itself:

- **Generating and holding a private GPG key requires a process with a real, persistent,
  access-controlled filesystem** - a browser tab and a stateless static file server cannot do this
  safely. The key must exist somewhere between key-generation requests, and that somewhere must not
  be the end user's browser, and must not be Pulp's own artifact storage (task requirement: never
  put signing keys in the normal Pulp content volume).
- **Automatic key rotation is a stateful background process**: "generate a NEXT key 90 days before
  expiry, activate it 30 days before expiry, retire the old one after a retention window" cannot be
  evaluated by an HTTP request handler with no request to handle - it needs a scheduler that runs
  whether or not anyone has Pulpit open in a browser.
- **Pulp's own `core.SigningService` is deliberately immutable and can only be created via a Django
  management command run on the Pulp server itself** (verified directly against pulpcore's source -
  see `docs/signing.md`) - something needs to track "which SigningService object corresponds to
  which of our keys, and has an administrator finished registering it yet," which is exactly the
  kind of small, durable, cross-request state ADR 0001 said Pulpit should never hold.

Bolting this onto the existing static SPA (e.g. as browser-side "state") is not an option: it would
mean either running a GPG binary in the browser (impossible) or handing the private key material to
JavaScript running on every visitor's machine (a severe, unacceptable security regression - task
section 15). A "just a small backend" BFF, the exact anti-pattern ADR 0001 warned about, is in this
one case not a shortcut around a real Pulp capability - it is what the feature _is_.

## Decision

Introduce **pulpit-core**: a new backend component, generic by design, not built around signing.

```
Browser -> Pulpit (nginx, static SPA - unchanged, still no backend of its own)
              |         \
              v          v
             Pulp     pulpit-core (FastAPI, its own Postgres database)
                          |
                          v
                     pulpit-worker (same codebase, privileged sibling process)
                          |
                          v
                 GPG / local signing key material
```

- **pulpit-core** (`pulpit-core/`) is a small FastAPI service with its own PostgreSQL database
  (`pulpit-core-db`), structured as `app/core/` (config, database, a generic Postgres-backed job
  queue, a minimal in-process event bus - all deliberately signing-agnostic) plus `app/modules/`
  (one package per feature; `signing` is the first). A module owns its own database tables, routes,
  and job handlers; nothing outside `app/modules/registry.py` imports a specific module, and no
  module imports another module's internals (task section 1/13) - the mechanism a second module
  (repository lifecycle automation, validation, vulnerability scanning, ...) would use later.
- **pulpit-worker** (`pulpit-core/worker/`) runs the same codebase's job-queue consumer and the
  signing module's rotation-check scheduler. It is the _only_ process anywhere in the stack with
  the GPG key material's volume mounted - `pulpit-core`'s own API process never imports the
  GPG-executing code path (`app/modules/signing/gpg_local.py`) and never has that volume, so it has
  no way to touch private key material even in principle (task section 15).
- The `pulpit` frontend container is **unchanged in kind**: still a static SPA with no database, no
  GPG access, no server-side logic of its own. It gains one more thing to reverse-proxy
  (`/pulpit-core/api/...`, `/keys/...`) via the same same-origin nginx layer ADR 0005 already
  established - not a new architectural pattern, an additional upstream.
- **Identity**: pulpit-core does not implement its own auth. It validates the browser's existing
  Pulp session/Basic-auth header against `GET /pulp/api/v3/login/` (the same "who am I" endpoint
  Pulpit's own frontend already uses - `docs/AUTHENTICATION.md`), so Pulp remains the single
  identity source end to end (`app/core/auth.py`).
- **Jobs**: originally a Postgres-backed queue (`SELECT ... FOR UPDATE SKIP LOCKED`) in pulpit-core's own
  database, not Redis. `redis` in this stack is Pulpcore's own optional HTTP cache
  (`docs/DEPLOYMENT.md` "Redis") and is not reused or repurposed by pulpit-core - keeping that
  service's existing role legible was more valuable than sharing infrastructure for a workload this
  small. A full broker (Celery/RQ/Kafka) would be infrastructure with no second consumer yet;
  revisit if/when a future module's throughput genuinely needs it.
- **Events**: an in-process publish/subscribe bus, durably logged to an `events_log` table for
  audit/replay, not a message broker - the same "don't add infrastructure before there's a second
  real consumer" reasoning as jobs.

## Alternatives considered

- **Keep signing entirely outside Pulpit** (a runbook + a script an operator runs by hand): rejected
  as not meeting the actual bar in the brief (a GUI-driven, automated rotation workflow) and not
  materially safer - the key still has to live somewhere.
- **Put the signing backend inside the existing `pulpit` nginx container** (e.g. an nginx module or
  a sidecar process in the same container): rejected - it would blur the one property ADR 0005/0001
  established that's still worth keeping, "the public-facing container has no secrets and no
  business logic," and would make the frontend image harder to reason about and patch.
  pulpit-core/pulpit-worker are separate containers specifically so the frontend's threat model
  doesn't change at all.
- **Give pulpit-worker Docker-socket access to `exec` into the `pulp` container** so it could run
  `pulpcore-manager add-signing-service` itself: initially rejected as a disproportionate privilege
  grant (raw Docker-socket access is effectively host root) for a rare, one-time-per-key operation.
  pulpit-core would instead only compute the exact command and surface it to the administrator - the
  same pattern this project already uses for Pulp database migrations (`docs/DEPLOYMENT.md`: "Do not
  run migrations automatically... this is an explicit, human-invoked operational command").

  **Revisited and reversed, narrowly, on explicit request**: the manual step turned out to be a real
  recurring friction point once mandatory resign-on-publish (see below) made key publishing a more
  frequent, GUI-driven action rather than a rare one-off. The decision was **not** to grant raw
  socket access after all - it was to introduce `PulpCommandExecutor`
  (`app/adapters/pulp/executor.py`), an interface with a pluggable implementation, and to have
  `pulpit-worker` reach the Docker Engine API only through `tecnativa/docker-socket-proxy` scoped to
  `CONTAINERS`+`EXEC` (list/inspect/exec only - no image, volume, network, or other-container
  access), targeting the `pulp` container purely by its existing Compose-assigned label. This keeps
  the original objection's substance intact (no component gets host-root-equivalent access) while
  removing the one purely-manual step that didn't otherwise need a human. It is opt-in: a deployment
  that isn't Docker (the whole reason `PulpCommandExecutor` is an interface, not a hardcoded Docker
  call) or that doesn't want to grant even the scoped proxy simply leaves it unconfigured, and
  automation degrades to exactly the original manual-command flow with no loss of function. See
  `docs/signing.md` "Automating the manual Pulp step."

  **Acted on**: `KubernetesExecExecutor` (same file) implements this same interface against the
  Kubernetes `pods/exec` API for `deployment/kube/` (`docs/DEPLOYMENT.md` "Kubernetes") - VERIFIED end-to-end
  against a real cluster, not just designed-for. Also VERIFIED live that `DockerExecExecutor`
  itself (and its scoped socket-proxy) work against Podman's Docker-API-compatible socket too,
  once one real SELinux confinement gotcha is worked around (`deployment/podman/`,
  `docs/DEPLOYMENT.md` "Podman") - the interface didn't need to change at all for either.

  **Superseded by ADR 0008**: `PulpCommandExecutor` and both its implementations were later
  deleted outright in favor of a reconciler colocated inside a derived Pulp image, which needs no
  cross-container privilege (Docker socket or Kubernetes RBAC) at all - see that ADR.

- **Reuse Pulp's own Postgres for pulpit-core's tables**: rejected - it would make pulpit-core's
  schema Pulp's problem during upgrades/migrations and reintroduce exactly the "second system
  quietly depends on the first system's internals" coupling ADR 0001 was written to avoid. A
  separate database keeps the boundary real, not just conventional.

## Consequences

- The project is no longer frontend-only in the way ADR 0001 described.
  `docs/ARCHITECTURE.md`/`docs/SECURITY.md` are updated alongside this ADR to state the boundary
  precisely: **Pulp is still the only system of record for repositories/content/users/permissions;
  pulpit-core is Pulpit's own backend for Pulpit-native features that Pulp cannot host itself
  (signing key custody and lifecycle being the first), and it must never duplicate or shadow data
  Pulp already owns.**
- Deployment complexity grows: two more images to build, one more database to back up
  (`docs/signing.md` "Backup and recovery"), one more thing that can be unhealthy. Compose's
  health-aware `depends_on` and healthchecks (`compose.yml`) keep startup ordering correct;
  production operators take on the same "one more service to run" cost any backend introduces.
- A future module (validation, vulnerability scanning, notifications, ...) has a concrete, proven
  place to live (`app/modules/<name>/`) without reopening this decision or destabilizing the
  signing module - the explicit design goal of this ADR.
- The frontend's own architecture is otherwise untouched: same build (Vite/React/PatternFly), same
  Dockerfile shape (static assets + nginx, no Node at runtime), same reverse-proxy pattern (ADR
  0005), same "no database, no GPG access" guarantee it always had.

## Transaction update (2026-09-08)

The queue also supports SQLite. A lifetime worker lock now enforces one consumer per
core database, including PostgreSQL, to serialize signing side effects. RUNNING is
committed before external work; completion is a separate short transaction. A worker
restart marks interrupted jobs failed for operator review instead of replaying them.
See `docs/ARCHITECTURE.md` for the current transaction boundaries.
