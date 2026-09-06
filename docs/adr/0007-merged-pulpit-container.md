# ADR 0007: Merge pulpit-core/pulpit-worker into the `pulpit` frontend container

## Status

Accepted

## Context

Since ADR 0006, this project's deployment topology was `pulp` + `pulpit` (nginx/SPA) +
`pulpit-core` (API) + `pulpit-worker` (job queue/signing automation, the only process with
GNUPGHOME access) + `pulpit-core-db` (its own Postgres) + `redis` + `docker-socket-proxy` -
six containers plus Pulp itself, each independently built, deployed, and versioned.

ADR 0006's process-level split (API process with zero GPG access, worker process with it)
is a real security property for a multi-tenant or externally-exposed deployment. Pulpit is
explicitly targeted at internal/self-hosted use (a small team's own Pulp instance, not a
SaaS product with untrusted tenants) - for that threat model, the operational cost of six
containers (six images to build/publish/update, six things that can fail independently, a
separate database server just for a few KB of settings/job rows) outweighs the isolation
benefit that split buys.

## Decision

Merge nginx + pulpit-core + pulpit-worker into one image/container (`pulpit`), replace
pulpit-core's own Postgres database with embedded SQLite, and keep Pulp reachable via a
plain `host:port` environment variable rather than a fixed Compose-network hostname - so
the resulting topology is conceptually "`pulpit` + `pulp`" (plus `redis`, an auxiliary cache
for Pulp's own HTTP responses, and `docker-socket-proxy` under Docker/Podman specifically -
see below), regardless of which platform (Docker, Podman, Kubernetes) it runs on.

**`deployment/docker/pulpit/entrypoint.sh`** runs as root initially (needed to start nginx and to
prepare the shared GNUPGHOME volume), then runs all three processes as separate OS
processes within the one container - nginx (own privilege drop to `www-data`, unrelated to
this decision), pulpit-core (as the unprivileged `pulpit` user), and the worker loop (as
uid/gid 700, unchanged from before the merge - see docs/signing.md "Shared volume
permissions" for why that exact uid). No supervisord/s6: if any of the three dies, the
script kills the other two and exits, restarting the whole container - simpler, and the
same "a crash restarts the whole container" behavior pulpit-worker alone already had.

**Pulp stays a separate container/Deployment.** Its own all-in-one image is
upstream-maintained and versioned independently; folding it in would mean rebuilding on top
of a moving target on every release instead of pulling `pulp/pulp:stable` directly. The
signing-automation exec mechanism (`app/adapters/pulp/executor.py`, ADR 0006) is unaffected
by this merge - it exists to reach into _that_ separate container/pod, not to let
pulpit-core/pulpit-worker talk to each other, so `docker-socket-proxy` (Docker/Podman) and
`KubernetesExecExecutor` (Kubernetes) both remain exactly as before. (Superseded by ADR 0008:
that exec mechanism was later removed entirely in favor of a reconciler colocated inside a
derived Pulp image - the "Pulp stays separate, rebuild-on-a-moving-target" reasoning here is
exactly why that ADR keeps the reconciler itself tiny rather than folding pulpit-core/worker
into the same image too.)

**Pulp's own address becomes a plain `host:port` string (`PULP_UPSTREAM`)**, not a
Compose-network-specific hostname - task requirement: "définir dans une var l'URL de
contact de pulp... quelle que soit la plateforme". `deployment/docker/nginx/pulpit.conf.template`'s
`proxy_pass` blocks were rewritten to drop their previously-hardcoded `:80`, so this one
variable now fully describes where Pulp is, on any platform - a sibling container, a
Kubernetes Service, or a real remote host, with no image change. pulpit-core's own API
needs no equivalent variable anymore: nginx and it now run in the same container, always
reachable at a fixed `http://127.0.0.1:8000`.

**pulpit-core's database becomes embedded SQLite** (`/var/lib/pulpit/pulpit-core.db`, one
PVC/volume, no separate database service). This was **not** assumed to be a safe swap -
`tests/conftest.py`'s own prior docstring explicitly claimed the models used Postgres-only
`JSONB`/native `UUID` types "that a SQLite substitute couldn't exercise faithfully". VERIFIED
directly rather than taken at face value:

- Every such column (`app/core/database/base.py`'s `UUIDPrimaryKeyMixin`,
  `app/core/events/models.py`, `app/core/jobs/models.py`,
  `app/modules/signing/models.py`) was switched from
  `sqlalchemy.dialects.postgresql.UUID`/`JSONB` to SQLAlchemy 2.0's own generic,
  cross-dialect `Uuid`/`JSON` types - round-trip-tested directly against both a real SQLite
  file and a real Postgres instance (real `uuid.UUID`/`dict` objects in, the same objects
  back out, on both). On Postgres this compiles to the exact same native `uuid` column as
  before; `json` instead of `jsonb` is the one real difference, and VERIFIED nothing in this
  codebase ever used a JSONB-only query feature (containment operators, GIN indexes) on
  these columns - pure storage, so no functional loss.
- The two migrations that used Postgres-only DDL directly (`postgresql.JSONB(...)` in the
  initial schema; bare `op.alter_column(existing_type=postgresql.TIMESTAMP())` for the
  timezone-aware-columns migration; a Postgres-only `substring(... from ...)` SQL expression
  in a data backfill) were rewritten to be dialect-portable
  (`op.batch_alter_table()`, a Python-side regex backfill instead of raw SQL) and VERIFIED by
  actually running the full migration chain from scratch against both a fresh SQLite file
  and a fresh Postgres instance, then running the full pytest suite against each.
- Two real bugs surfaced only by this SQLite testing, both fixed, neither Postgres-specific
  in nature: `signing/service.py`'s `get_key()` received a plain string (not a `uuid.UUID`
  object) from a Job's own JSON `payload` column (JSON has no native UUID type - Postgres's
  own native `uuid` column silently accepts a string at the SQL level regardless of the
  Python-side type, masking this; SQLite's stricter generic `Uuid` type does not) - fixed by
  normalizing in `get_key()` itself. `DateTime(timezone=True)` values come back
  timezone-_naive_ from SQLite (no real timestamp type at all) despite storing UTC
  correctly, unlike Postgres's `TIMESTAMPTZ` - fixed with a small `UTCDateTime`
  `TypeDecorator` (`app/core/database/base.py`) that reattaches `timezone.utc` on read
  (always correct, since every value this app ever writes is already UTC).
- A real, non-obvious cross-process permission conflict: pulpit-core (API/migrations, the
  `pulpit` user) and the worker loop (uid/gid 700) both need to read/write the same SQLite
  file and its WAL-mode sidecar files. VERIFIED neither a permissive umask nor a POSIX
  default ACL on the data directory fixes this - SQLite opens its files with an explicit,
  non-default mode that caps both mechanisms regardless of what they'd otherwise grant. The
  actual fix: `pulpit` is a _supplementary_ member of a dedicated gid 700 group (built into
  the image), the shared data directory is setgid + group-owned by that same gid, and
  `deployment/docker/pulpit/entrypoint.sh` re-applies `chmod 0660` to the known files once right after
  migrations and again a few seconds after both processes are running (a real startup race
  where either side's first SQLite connection can recreate the WAL sidecar files with
  different ownership - VERIFIED steady-state operation afterward doesn't re-trigger it).
  GNUPGHOME itself keeps its original uid/gid 700, mode 0700, no group access at all -
  pulpit-core must never be able to read private key material, even via a shared group
  (task section 2, docs/signing.md) - this fix is scoped to the SQLite data directory only.

Existing Postgres deployments are not a one-way door: `PULPIT_CORE_DATABASE_URL` remains a
plain SQLAlchemy connection string, so pointing it at a real Postgres instance instead of
the embedded-SQLite default continues to work unchanged, using the same portable model/
migration code either way.

## Alternatives considered

- **Merge everything, including Pulp, into one container**: rejected - see "Pulp stays
  separate" above.
- **Merge pulpit-core and pulpit-worker only, leaving nginx/pulpit as its own container**:
  a smaller, less disruptive change, but leaves the reverse proxy as a fourth container for
  no remaining architectural reason once pulpit-core/pulpit-worker are already merged -
  rejected in favor of going all the way to two conceptual containers.
- **Keep pulpit-core's database on Postgres, just relocate the container**: avoids the
  SQLite-portability work above entirely, but keeps a full Postgres server (and its own
  volume/backup story) running just to hold a handful of settings/job rows - rejected once
  the SQLite path was verified to actually work correctly, per an explicit "internal tool,
  fewer moving parts" preference.
- **A process supervisor (supervisord/s6-overlay) instead of a hand-rolled entrypoint
  script**: would give per-process auto-restart without restarting the whole container:
  deferred, not rejected outright - the simpler "any crash restarts everything" behavior
  matches what pulpit-worker alone already did before the merge, and this project's own
  stated preference against introducing infrastructure before it's actually needed. Revisit
  if per-process restart semantics ever become worth the added complexity.

## Consequences

- One image (`docker.io/simonverbois/pulpit`) instead of three - the release workflow
  (`.forgejo/workflows/release.yml`) builds and pushes only this one now.
- `compose.yml`/`compose-dev.yml` lose the `pulpit-core`, `pulpit-worker`, and
  `pulpit-core-db` services entirely; `deployment/kube/` loses the equivalent separate Deployments/PVC,
  down to one Deployment (`pulpit.yaml`) plus `pulp.yaml`/`redis.yaml`.
- A single-instance bottleneck by construction: embedded SQLite and the merged container are
  both inherently single-writer/single-replica. This was already effectively true for
  pulpit-worker (a singleton job-queue consumer) and for pulpit-core-db (a single Postgres
  instance, no HA configured) - this ADR does not reduce availability versus what was
  actually running before, it makes the existing single-instance assumption explicit and
  removes the now-unnecessary appearance of independent scalability the three-container
  split implied.
- Any single-line frontend change now rebuilds/redeploys a heavier image (it also bundles
  gnupg/rpm/nginx and pulpit-core's own Python dependencies) - acceptable for this project's
  release cadence, revisit if that becomes a real friction point.
- Revisiting this (e.g. splitting back out, or introducing a process supervisor) is expected
  to happen if this project's deployment target ever shifts toward multi-tenant/externally-
  exposed use, where ADR 0006's original process isolation matters more than it does here;
  update this ADR rather than silently changing the topology.
