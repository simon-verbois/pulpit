# Deployment

Pulpit ships as a single container image — nginx (static JS/CSS, no Node runtime at rest — ADR 0001) + pulpit-core (API) + pulpit-worker (job queue/signing automation) merged into one process
group (ADR 0007) — that must be deployed alongside a Pulp instance behind one same-origin reverse
proxy (ADR 0005). This document covers the local Compose reference topology, using
`deployment/docker/compose.yml`, whose `pulpit` service pulls its published `simonverbois/pulpit`
image from Docker Hub (built and pushed by `.forgejo/workflows/release.yml`); a hardened
production topology is future work (`docs/ROADMAP.md` Milestone 6). To deploy unreleased local
changes instead, use `deployment/docker/compose-dev.yml` (`docs/DEVELOPMENT.md` "Mode B"), which
builds it from source but is otherwise identical. Also available: Podman ("Podman" below) and
Kubernetes ("Kubernetes" below).

## Reference topology (local Compose)

```
https://localhost:${PULPIT_HTTP_PORT}/
    /                    -> Pulpit static SPA        (pulpit container, nginx)
    /pulp/api/...        -> Pulp REST API             (pulp container)
    /pulp/content/...    -> Pulp content app          (pulp container)
    /v2/...              -> Pulp container registry   (pulp container)
    /extensions/v2/...   -> Pulp registry signature API (pulp container)
    /pulp/container/...  -> Pulp container content app (pulp container)
    /pulpit-core/api/... -> pulpit-core API            (same pulpit container, ADR 0006/0007)
    /keys/...            -> pulpit-core public keys    (same pulpit container, unauthenticated)
    /ui/...              -> 404 (legacy pulp-ui hidden)
```

Only the `pulpit` service's port is published to the host; `pulp` is reached exclusively through
that proxy, so there is exactly one public entry point, no CORS configuration, and no absolute
hostnames baked into the frontend. pulpit-core's API and pulpit-worker's job queue (ADR 0006) run
inside that same `pulpit` container (ADR 0007) - the API is reached through the proxy same as Pulp,
the worker loop is never reached by the browser at all.

`redis` sits on the internal Compose network only (no published port, nothing proxied to it
directly) — see "Redis" below.

## Bringing the stack up

```sh
cp .env.example .env
# generate a real secret, then paste it into .env
openssl rand -hex 32   # -> PULP_SECRET_KEY
docker compose -f deployment/docker/compose.yml --env-file .env up -d
docker compose -f deployment/docker/compose.yml --env-file .env ps
```

(`--env-file .env` is required since `deployment/docker/compose.yml` no longer lives at the repo
root - see that file's own header comment. `make compose-up` does the equivalent for
`compose-dev.yml`, the local-build variant, with the right flags already baked in.)

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

`pulpit` (ADR 0006/0007) adds three more named volumes, documented in full in `docs/signing.md`
("Docker volumes" / "Backup and recovery"):

- `pulpit_data` — pulpit-core's own embedded SQLite database (signing settings/key
  metadata/job history - ADR 0007). Back this up like any other application database; it's a
  single file (`pulpit-core.db`, plus its WAL-mode sidecar files) under this volume.
- `pulpit_signing_gnupghome` — the GPG keyring, **including private key material**. Mounted into
  the `pulpit` container (readable only by the worker loop's own uid/gid 700 inside it,
  docs/signing.md "Shared volume permissions") and `pulp`, never exposed to the API/nginx side of
  that same container. Losing it without a backup means losing the ability to sign with the
  current key — see docs/signing.md "Recovery after key loss."
- `pulpit_signing_scripts` — the generic signing scripts the worker loop publishes for `pulp` to
  execute. Not secret, regenerated automatically from the `pulpit` image on every start.

## Secrets

`PULP_SECRET_KEY` must be set to a real generated value (`openssl rand -hex 32`) in a local,
untracked `.env`. `compose.yml` references it as a required variable
(`${PULP_SECRET_KEY:?...}` — Compose interpolation) so `docker compose up` fails fast with a clear
error instead of silently starting Pulp with an empty/missing key. There is no separate database
password to set (ADR 0007 - pulpit-core's database is embedded SQLite by default, not a
credentialed server).

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

## pulpit-core / pulpit-worker (ADR 0006, merged into `pulpit` by ADR 0007)

pulpit-core (the API process) and pulpit-worker (the job-queue/rotation-scheduler loop, the only
one with the GPG signing volume - `pulpit_signing_gnupghome` - mounted) run as two separate OS
processes inside the same `pulpit` container/image (`deployment/docker/pulpit/entrypoint.sh`), not as
separate Compose services - see ADR 0007 for why and how the process-level separation (API never
touches private key material) is preserved despite sharing a container.

`pulpit`'s worker loop never reaches into the `pulp` container to automate the one Pulp-side
administrative command signing needs (`add-signing-service`) - since ADR 0008, `pulp` itself runs a
derived image (`docker.io/simonverbois/pulp-pulpit`) with a small colocated reconciler baked in as
an s6 service instead, so there is no extra Compose service or cross-container privilege of any
kind for this. A deployment running vanilla `pulp/pulp:stable` simply doesn't get this automation
and falls back to the manual flow - see `docs/signing.md` "Automating the manual Pulp step" and ADR
0008.

`pulpit` is healthchecked through nginx (`GET /pulpit-core/api/v1/health`, exercising the whole
proxy chain, not just the API process alone) and needs `PULP_ADMIN_PASSWORD` set to a real value
(same variable Pulp's own admin account uses) to authenticate its own server-to-server calls to
Pulp's API — leave it unset and signing-related jobs fail with a clear "Pulp is currently
unavailable" error until it's set, without affecting anything else in the stack. Check
`docker compose logs pulpit` if signing jobs seem stuck (the worker loop has no HTTP endpoint of
its own to healthcheck separately).

Full detail on the signing module itself — key generation, rotation, automating the Pulp
signing-service registration step, trust model, backup/recovery — lives in `docs/signing.md`.

## Known issue (fixed): nginx caches Pulp's IP, 502s after `pulp` alone is recreated

**VERIFIED**: `deployment/docker/nginx/pulpit.conf.template`'s `proxy_pass` originally used a bare
`http://pulp:80`. nginx resolves that hostname once and keeps using the resolved IP for the
worker process's lifetime; if `pulp` is later recreated (e.g. after changing one of its env vars,
as happened when Redis was added) without also restarting `pulpit`, the `pulp` container gets a
new internal IP and every request through the proxy 502s — even though hitting `pulp` directly
(e.g. on `PULP_HTTP_PORT`) works fine, which is the tell that this is an nginx-side staleness
issue, not a Pulp problem. Fixed by adding an explicit `resolver` and moving the upstream into a
`set $pulp_upstream ...; proxy_pass $pulp_upstream;` pair per location — using a variable in
`proxy_pass` is what makes nginx actually re-resolve against that resolver instead of caching
indefinitely. Confirmed by force-recreating `pulp` alone and checking the proxy still returns
`200` immediately after, with no `pulpit` restart.

The resolver address itself was originally hardcoded to `127.0.0.11` (Docker Compose's embedded
DNS) - **VERIFIED live this breaks under Podman** (nothing listens on `127.0.0.11` there; its own
DNS runs on the network's bridge gateway instead, a different address per deployment) and isn't
fixed under Kubernetes either (CoreDNS's ClusterIP isn't a universal constant). Fixed for good by
opting into the base `nginx` image's own `NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1` (Dockerfile), which
reads `/etc/resolv.conf` at container start and exports `NGINX_LOCAL_RESOLVERS` - every platform
(Docker, Podman, Kubernetes) writes its own correct nameserver(s) there, so this needs no
per-platform override. VERIFIED live: rebuilt this image and ran it on a real user-defined Docker
network (resolved `127.0.0.11`, as before) and a real Podman network (resolved `10.89.0.1`,
Podman's own DNS) — `nginx -t` passes in both.

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
  `compose.yml`, `deployment/docker/pulp/Dockerfile`, or Pulpit's code. The stack still starts and
  becomes healthy; these come from upstream and aren't something Pulpit can patch short of forking
  that image.

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

Both are now proxied in `deployment/docker/nginx/pulpit.conf.template`, alongside the existing `/v2/` block.

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

A corporate TLS-inspecting proxy typically presents its own certificate, signed by an internal CA
the system trust store doesn't know about. Pulp's per-remote `tls_validation` (VERIFIED live: one
flag shared by the proxy connection AND the origin server, no way to relax just one) and `ca_cert`
(VERIFIED directly in pulpcore's `DownloaderFactory`: builds one `SSLContext` per remote's aiohttp
session, trusting `ca_cert` **in addition to**, not instead of, the system's own CA bundle) are
pulpcore's own answer to this - no container-filesystem trust-store automation needed. Pulpit's
Administration > Default Settings page lets an administrator set both once (**Skip TLS
certificate validation** / **Trusted CA certificate (PEM)**), auto-applied to every new Remote's
own fields (still overridable per Remote under its own "Advanced connection settings").

## Podman

`deployment/podman/` runs this stack via `podman play kube` (plain Kubernetes-YAML Pod manifests
Podman itself interprets directly, no `docker-compose`/`podman-compose` wrapper - explicit
project choice) rather than Compose:

```sh
cp deployment/podman/00-secret.example.yaml deployment/podman/00-secret.yaml
# edit deployment/podman/00-secret.yaml - replace every REPLACE_ME value

systemctl --user start podman.socket   # rootless
./deployment/podman/deploy.sh up
```

See `deployment/podman/README.md` for the full picture, including several real, VERIFIED-live
differences from both Compose and a real Kubernetes cluster that shaped these manifests -
`podman play kube` only supports a subset of Kubernetes kinds (no Ingress, no RBAC, no real
Service objects - no longer a limitation signing automation needs to work around since ADR 0008,
see below), ConfigMaps/Secrets are not standalone objects the way they are on a real cluster,
there is no `postStart` hook, and SELinux confinement blocks more than Docker's default does on an
SELinux-enforcing host (Fedora/RHEL, Podman's own primary ecosystem) - root-caused with
`ausearch -m avc`, not guessed: reading a plain `hostPath`-mounted file is denied entirely under
SELinux enforcement, deliberate anti-escape confinement, not a bug.

## Kubernetes

Plain manifests (no Helm) live under `deployment/kube/` - see `deployment/kube/README.md` for prerequisites (notably a
storageClass supporting `ReadWriteMany`, needed only if you want repository signing) and the
exact `kubectl apply` invocation. They mirror this file's own Compose topology 1:1 (one `pulpit`
Deployment, ADR 0007), using the same published Docker Hub images (`pulpit`, and since ADR 0008
`pulp-pulpit` for `pulp` itself).

Since ADR 0008, there is no architectural difference from Compose/Podman here at all: `pulp.yaml`
runs the same derived `docker.io/simonverbois/pulp-pulpit` image every other target uses, which
reconciles signing-service registration from *inside* the pod itself - no ServiceAccount, Role,
RoleBinding, or any other RBAC exists in `deployment/kube/` any more, and `pulpit` never talks to
the Kubernetes API at all.

## Production (future work)

Not implemented at bootstrap time. Expected differences from the dev Compose setup, to be
designed when this milestone starts (`docs/ROADMAP.md` Milestone 6):

- TLS termination at (or in front of) the nginx layer; HSTS and other TLS-only headers enabled
  only once TLS is actually present (`docs/SECURITY.md`).
- `PULP_SECRET_KEY` and other secrets sourced from a real secret manager, not a `.env` file.
- `deployment/kube/`'s manifests are a working baseline, not a production-hardened one: no NetworkPolicies,
  PodDisruptionBudgets, resource requests/limits, autoscaling, or TLS on the Ingress yet (see
  `deployment/kube/README.md` "Known gaps").
