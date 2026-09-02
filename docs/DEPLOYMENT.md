# Deployment

Pulpit ships as a static-asset container image (nginx + built JS/CSS, no Node runtime — ADR 0001)
that must be deployed alongside a Pulp instance behind one same-origin reverse proxy (ADR 0005).
This document covers the local Compose reference topology; a hardened production topology is
future work (`docs/ROADMAP.md` Milestone 6).

## Reference topology (local Compose)

```
https://localhost:${PULPIT_HTTP_PORT}/
    /                    -> Pulpit static SPA        (pulpit container, nginx)
    /pulp/api/...        -> Pulp REST API             (pulp container)
    /pulp/content/...    -> Pulp content app          (pulp container)
    /v2/...              -> Pulp container registry   (pulp container)
    /extensions/v2/...   -> Pulp registry signature API (pulp container)
    /pulp/container/...  -> Pulp container content app (pulp container)
    /pulpit-core/api/... -> pulpit-core API            (pulpit-core container, ADR 0006)
    /keys/...            -> pulpit-core public keys    (pulpit-core container, unauthenticated)
    /ui/...              -> 404 (legacy pulp-ui hidden)
```

Only the `pulpit` service's port is published to the host; `pulp`, `pulpit-core`, and
`pulpit-worker` are reached exclusively through that proxy (or, for `pulpit-worker`, not reached by
the browser at all), so there is exactly one public entry point, no CORS configuration, and no
absolute hostnames baked into the frontend.

`redis`, `pulpit-core-db`, and `pulpit-worker` sit on the internal Compose network only (no
published port, nothing proxied to them directly) — see "Redis" and "pulpit-core / pulpit-worker
(ADR 0006)" below.

## Bringing the stack up

```sh
cp .env.example .env
# generate real secrets, then paste them into .env
openssl rand -hex 32   # -> PULP_SECRET_KEY
openssl rand -hex 32   # -> PULPIT_CORE_DB_PASSWORD (ADR 0006)
docker compose up -d --build
docker compose ps
```

Acceptance checks (see also `make pulp-status`):

```sh
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/                 # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/pulp/api/v3/status/  # 200 (or 401 if auth required)
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/ui/              # 404
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/v2/              # reaches Pulp - see note below on the exact code to expect
```

**VERIFIED** against the bootstrap dev stack: `/v2/` returns `500`, not `401` — see "Known
limitation: pulp_container's registry requires `TOKEN_SERVER`" below. The important thing to check
is that it's the _same_ response whether requested through `pulpit` (port `8080`) or directly
against `pulp` (port `${PULP_HTTP_PORT}`, dev-only) — that confirms nginx is routing correctly and
any error is Pulp's own, not a misroute. A `404` or `502` specifically from nginx (i.e. a
_different_ response than hitting `pulp` directly) would indicate a real Pulpit routing bug.

## Persistence

The `pulp` service uses named Docker volumes (not bind mounts, per project default) for:

- `/etc/pulp`
- `/var/lib/pulp` (this already covers the nested `/var/lib/pulp/.local/share/containers` path)
- `/var/lib/pgsql`
- `/var/lib/containers`

Named volumes are preferred over a project-local `.data/` bind mount because the all-in-one
image writes files as internal container UIDs that don't always map cleanly onto the host user;
named volumes sidestep that. Nothing under these volumes is committed to version control.

`pulpit-core` (ADR 0006) adds three more named volumes, documented in full in `docs/signing.md`
("Docker volumes" / "Backup and recovery"):

- `pulpit_core_pgdata` — pulpit-core's own PostgreSQL data directory (signing settings/key
  metadata/job history). Back this up like any other application database.
- `pulpit_signing_gnupghome` — the GPG keyring, **including private key material**. Mounted only
  into `pulpit-worker` and `pulp` (docs/signing.md "Shared volume permissions"), never into
  `pulpit-core` or the `pulpit` frontend. Losing it without a backup means losing the ability to
  sign with the current key — see docs/signing.md "Recovery after key loss."
- `pulpit_signing_scripts` — the generic signing scripts pulpit-worker publishes for `pulp` to
  execute. Not secret, regenerated automatically from the `pulpit-worker` image on every start.

## Secrets

`PULP_SECRET_KEY` must be set to a real generated value (`openssl rand -hex 32`) in a local,
untracked `.env`. `compose.yml` references it as a required variable
(`${PULP_SECRET_KEY:?...}` — Compose interpolation) so `docker compose up` fails fast with a clear
error instead of silently starting Pulp with an empty/missing key. `PULPIT_CORE_DB_PASSWORD` (ADR 0006) is required the same way, for the same reason.

## Redis

**VERIFIED** against a live pulpcore 3.116.0 instance: Redis is **optional** for this pulpcore
version. Reading `pulpcore/app/redis_connection.py`, a connection is only ever attempted if
`CACHE_ENABLED` is true or `WORKER_TYPE == "redis"` — this pulpcore version's default task worker
is Postgres-based, not Redis/RQ, so with neither set, `redis_connection.connected` in
`/pulp/api/v3/status/` is simply `false` and nothing is actually broken (tasks, sync, auth all
work without it). The `redis` service and the `pulp` service's `PULP_CACHE_ENABLED` /
`PULP_REDIS_HOST` / `PULP_REDIS_PORT` env vars in `compose.yml` turn on pulpcore's real
Redis-backed HTTP response cache (used for things like RPM repo metadata) rather than just making
the status page cosmetically say "Connected." It's a plain, unauthenticated `redis:8-alpine`
container with no persistence (cache data, safe to lose) on the internal Compose network only —
never published to the host.

## pulpit-core / pulpit-worker (ADR 0006)

Four more Compose services, none published to the host:

- `pulpit-core-db` — a plain `postgres:16-alpine`, pulpit-core's own database. Healthchecked
  (`pg_isready`); `pulpit-core`/`pulpit-worker` wait for it via health-aware `depends_on`.
- `pulpit-core` — the API process. Healthchecked (`GET /api/v1/health`); `pulpit` (the frontend
  container) waits for it the same way before its own container is considered up.
- `pulpit-worker` — the job-queue/rotation-scheduler process, the only one with the GPG signing
  volume (`pulpit_signing_gnupghome`) mounted. No published port, no healthcheck endpoint (it's a
  polling loop, not an HTTP server) — check `docker compose logs pulpit-worker` if signing jobs seem
  stuck.
- `docker-socket-proxy` (`tecnativa/docker-socket-proxy`) — optional, opt-in: lets `pulpit-worker`
  automate the one Pulp-side administrative command signing needs (`add-signing-service`) instead
  of an administrator running it by hand. Scoped to `CONTAINERS`+`EXEC` only (list/inspect/exec) —
  never the raw Docker socket, and no other Docker API call is forwarded. Internal-network-only,
  never published. A deployment that isn't Docker at all, or doesn't want to grant even this scoped
  access, simply omits `PULPIT_CORE_PULP_EXECUTOR_DOCKER_HOST` and gets the fully manual flow
  instead — see `docs/signing.md` "Automating the manual Pulp step" and ADR 0006 "Alternatives
  considered".

Both `pulpit-core` and `pulpit-worker` need `PULP_ADMIN_PASSWORD` set to a real value (same
variable Pulp's own admin account uses) to authenticate their own server-to-server calls to Pulp's
API — leave it unset and signing-related jobs fail with a clear "Pulp is currently unavailable"
error until it's set, without affecting anything else in the stack.

Full detail on the signing module itself — key generation, rotation, automating the Pulp
signing-service registration step, trust model, backup/recovery — lives in `docs/signing.md`.

## Known issue (fixed): nginx caches Pulp's IP, 502s after `pulp` alone is recreated

**VERIFIED**: `docker/nginx/pulpit.conf.template`'s `proxy_pass` originally used a bare
`http://pulp:80`. nginx resolves that hostname once and keeps using the resolved IP for the
worker process's lifetime; if `pulp` is later recreated (e.g. after changing one of its env vars,
as happened when Redis was added) without also restarting `pulpit`, the `pulp` container gets a
new internal IP and every request through the proxy 502s — even though hitting `pulp` directly
(e.g. on `PULP_HTTP_PORT`) works fine, which is the tell that this is an nginx-side staleness
issue, not a Pulp problem. Fixed by adding `resolver 127.0.0.11 valid=10s;` (Docker Compose's
embedded DNS, available on every network it creates) and moving the upstream into a `set $pulp_upstream ...; proxy_pass $pulp_upstream;`
pair per location — using a variable in `proxy_pass` is what makes nginx actually re-resolve
against that resolver instead of caching indefinitely. Confirmed by force-recreating `pulp` alone
and checking the proxy still returns `200` immediately after, with no `pulpit` restart.

## Known operational issue: pending migrations -> 502

An all-in-one Pulp container can reach a state where nginx is up but the API returns `502 Bad
Gateway` because database migrations haven't finished applying (observed previously as many
`[ ] migration` entries in `pulpcore-manager showmigrations`). This is not a Pulpit bug; it's a
Pulp startup/ordering issue. Diagnose and fix with:

```sh
make pulp-migrations   # docker compose exec pulp pulpcore-manager showmigrations
make pulp-migrate      # docker compose exec pulp pulpcore-manager migrate --noinput
```

Do not run migrations automatically from the frontend or from application code — this is an
explicit, human-invoked operational command (`make pulp-migrate`), never something Pulpit's JS
triggers.

## Known harmless startup warnings

`docker compose up` on a fresh stack prints several warnings that come from vendor base images,
not from Pulpit's own code, and are not fixable from this repository:

- `redis-1 | WARNING Memory overcommit must be enabled!` — Redis checks the host's
  `vm.overcommit_memory` sysctl unconditionally at startup and always prints this if it isn't `1`,
  regardless of configuration. `redis` here has no persistence at all
  (`command: redis-server --save "" --appendonly no` - see "Redis" above), so nothing ever triggers
  the background-save fork this warning is actually about. Set `vm.overcommit_memory = 1` on the
  Docker host (`/etc/sysctl.conf`, then `sysctl vm.overcommit_memory=1` or reboot) if you want the
  message gone entirely; it's optional here.
- `redis-1 | WARNING: Redis does not require authentication...` — expected; see "Redis" above
  (internal Compose network only, never published to the host).
- `pulp-1 | egrep: warning: egrep is obsolescent`, an RPM macro warning about `%add_sysuser`, and
  an `s6-chown: fatal:` line about `/var/lib/pgsql/16/backups` — all emitted by the
  `pulp/pulp:stable` image's own init scripts/RPM macros during first boot, not by anything in
  `compose.yml` or Pulpit's code. The stack still starts and becomes healthy; these come from
  upstream and aren't something Pulpit can patch short of forking that image.
- `docker-socket-proxy-1 | [WARNING] missing timeouts for backend 'docker-events'` — that backend
  is shipped by the `tecnativa/docker-socket-proxy` image's own `haproxy.cfg.template` with
  `timeout server 0` (intentionally unbounded, since `/events` is a long-lived streaming
  connection) - not configurable via this service's environment variables.
- `docker-socket-proxy-1 | [WARNING] HAProxy was started as root...` — the same image runs HAProxy
  as root with no option to drop privileges or chroot; there is no supported way to change this
  without replacing the image. Its actual security boundary is the scoped API allowlist
  (`CONTAINERS`/`EXEC`/`POST` only - see the service's own comment in `compose.yml`), not the
  container's internal user.

## Container registry authentication: `TOKEN_AUTH_DISABLED`

**RESOLVED for this dev stack** (previously a known limitation — `GET /v2/` returned a `500`,
`AttributeError: TOKEN_SERVER`, since pulp_container's registry API uses Docker/OCI token-based
auth by default, which needs a `TOKEN_SERVER` URL plus a signing keypair
(`TOKEN_SIGNATURE_ALGORITHM`/public+private key settings) configured — even to return a proper
`401` instead of crashing).

Generating and securely mounting a real signing keypair is genuine, security-sensitive Pulp-side
configuration beyond this bootstrap's scope. Instead, `compose.yml` sets
`PULP_TOKEN_AUTH_DISABLED: "true"` — a first-class, officially supported pulp_container setting
(used throughout its own functional test suite for the same reason, see
`pulp_container/app/checks.py`), which skips the token-server requirement entirely and falls back
to the same session/Basic auth already used everywhere else in this app. **Do not carry this
setting into a production deployment** — it means anyone who can authenticate to Pulp at all can
pull/push through the registry, with no per-repository token scoping.

**VERIFIED end-to-end** with this setting on: a real `podman pull` against a distribution created
through Pulpit succeeded and produced the exact expected image digest (Milestone 3). Getting there
surfaced two more missing nginx routes, the same class of gap as the `/pulp_ansible/` one below:

- `/pulp/container/...` — pulp_container's own content-serving app. `/v2/.../blobs/...` and
  `/v2/.../manifests/...` respond with a `302` redirect to a signed URL under this prefix, a
  _different_ path from the generic `/pulp/content/` RPM/Ansible use. Without a route for it, the
  redirect landed on Pulpit's own SPA fallback (a `200` with `index.html`, not the real blob) —
  which surfaced downstream as a confusing "digest does not match" error from `podman`, not an
  obvious routing failure.
- `/extensions/v2/...` — pulp_container's "atomic" image-signature extension API, which podman/
  docker clients probe on every pull even when no signatures exist. Same missing-route symptom,
  surfacing as `podman`'s "decoding signature list: invalid character '<'" (it received HTML).

Both are now proxied in `docker/nginx/pulpit.conf.template`, alongside the existing `/v2/` block.

## Known operational requirement: `CSRF_TRUSTED_ORIGINS`

**VERIFIED** against the bootstrap dev stack: once a user is logged in (session-cookie auth, see
`docs/AUTHENTICATION.md`), any mutating request (logout, and later any repository/content
mutation) sent from the browser with only the session cookie (no Basic-auth header) fails with:

```
403 {"detail": "CSRF Failed: Origin checking failed - http://localhost:8080 does not match any trusted origins."}
```

Django's CSRF middleware checks the request's `Origin` header against `CSRF_TRUSTED_ORIGINS`,
which pulpcore does not default to Pulpit's own origin. `compose.yml` sets it explicitly:

```yaml
PULP_CSRF_TRUSTED_ORIGINS: '["${PULPIT_PUBLIC_ORIGIN:-http://localhost:8080}"]'
```

Two things had to be verified empirically here, not assumed: (1) that pulpcore's dynaconf-based
settings pick up a `PULP_CSRF_TRUSTED_ORIGINS` env var at all (it does - the same convention as
`PULP_SECRET_KEY`), and (2) that the value must be a **JSON array**, not a bare string - a plain
`http://localhost:8080` value resolves to the Python string `"http://localhost:8080"`, which
Django's CSRF check then iterates character-by-character and never matches. If you change
`PULPIT_HTTP_PORT` or deploy behind a different public hostname, set `PULPIT_PUBLIC_ORIGIN` in
`.env` to match (see `.env.example`) or logins will authenticate but every subsequent mutation
(including logout) will 403.

## Outbound HTTP proxy for syncing

**VERIFIED**: pulpcore's sync downloader does **not** honor container-level `HTTP_PROXY`/
`HTTPS_PROXY` env vars. Tested directly: with those env vars set on the `pulp` service (pointed at
a real Squid proxy on the same Compose network) and a manual `curl -x <proxy> ...` from inside the
`pulp` container confirmed reaching the proxy fine, a real repository sync triggered through the
API still made its request directly - nothing appeared in the proxy's access log. So there is no
compose.yml env var to set for this; adding one would silently do nothing for sync traffic.

The mechanism that **does** work is Pulp's own per-remote `proxy_url` (`proxy_username`/
`proxy_password` alongside it, all standard pulpcore Remote fields, not RPM-specific) - VERIFIED
by setting it directly on a remote and confirming a subsequent sync's outbound request actually
appeared in the test proxy's access log. Pulpit exposes these under "Advanced connection
settings" in every plugin's Create/Edit Remote modals - RPM, Container, and Ansible alike
(collapsed by default). Since Pulp never echoes a
remote's `proxy_username`/`proxy_password`/origin `username`/`password` back on GET (it only
reports whether one `is_set`), the edit form shows them blank with a "currently set" hint rather
than the actual value - leaving a field blank on save keeps whatever was set before.

## Production (future work)

Not implemented at bootstrap time. Expected differences from the dev Compose setup, to be
designed when this milestone starts (`docs/ROADMAP.md` Milestone 6):

- TLS termination at (or in front of) the nginx layer; HSTS and other TLS-only headers enabled
  only once TLS is actually present (`docs/SECURITY.md`).
- `PULP_SECRET_KEY` and other secrets sourced from a real secret manager, not a `.env` file.
- No Kubernetes manifests or Helm charts at bootstrap time (explicitly out of scope per the
  bootstrap brief); Compose remains the reference topology until a production orchestrator target
  is chosen.
