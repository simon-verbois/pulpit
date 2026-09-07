# ADR 0008: Reconcile Pulp signing-service registration from inside a derived Pulp image

## Status

Accepted

## Context

Registering a Pulp `core.SigningService` has no REST endpoint at all (`docs/PULP_API.md`:
"`signing-services/` is read-only") - the only way is `pulpcore-manager add-signing-service`, a
Django management command that must run **inside the Pulp process** (it needs Pulp's own GPG-key
validation and database access). ADR 0006 automated this by having `pulpit-worker` reach _into_ the
`pulp` container from the outside via `PulpCommandExecutor`
(`app/adapters/pulp/executor.py`):

- Docker/Podman: `DockerExecExecutor`, talking to a scoped `docker-socket-proxy`
  (`tecnativa/docker-socket-proxy`, `CONTAINERS`+`EXEC` only) rather than the raw Docker socket.
- Kubernetes: `KubernetesExecExecutor`, talking to the `pods/exec` API subresource, authorized by a
  dedicated `ServiceAccount`/`Role`/`RoleBinding` scoped to `get`/`list` on `pods` and
  `get`/`create` on `pods/exec`.

Both are real, audited privileges - ADR 0006 itself calls the Docker-socket case "a deliberate,
explicit reversal of [its] original 'no Docker socket access' stance" - and neither collapses the
container count: Docker/Podman still ran 4 services (`redis`, `pulp`, `docker-socket-proxy`,
`pulpit`), and Podman's `docker-socket-proxy` pod additionally needed an SELinux `spc_t` workaround
to reach Podman's own API socket at all. Docker/Podman and Kubernetes also needed two entirely
different code paths and deployment artifacts for the exact same job.

Simply moving Pulp's own address into an env var (as considered early on, à la other self-hosted
apps that parameterize every upstream URL) does not help here: `pulp_base_url`/`PULP_UPSTREAM`
already exist (ADR 0007) for every _other_ Pulp call this project makes. The one operation that
needs cross-container reach isn't an HTTP call at all - it's a local management command that must
execute inside Pulp's own process/DB context, which no amount of URL configuration changes.

## Decision

Stop reaching into the `pulp` container from the outside. Instead, run a small reconciler **inside
a Pulp-derived image**, alongside Pulp's own s6-overlay-supervised processes (Pulp's own all-in-one
image already uses `/init` (s6-overlay) to run API/content/workers/nginx/PostgreSQL/Redis in one
container - one more longrun service fits the same model):

- `docker.io/simonverbois/pulp-pulpit` (`deployment/docker/pulp/Dockerfile`) is
  `docker.io/pulp/pulp:stable` plus `pulpit-signing-reconciler`
  (`deployment/docker/pulp/pulpit-signing-reconciler`) registered as an s6-overlay longrun
  (`deployment/docker/pulp/s6/pulpit-signing-reconciler/`).
- `pulpit-worker` keeps owning the _decision_ of which `SigningPulpService` rows need registering
  (unchanged: the `signing_pulp_services` table, `PENDING_MANUAL_SETUP` status). Instead of
  executing the command remotely, `signing.check_pulp_bootstrap` (`jobs.py`) now writes an atomic
  JSON manifest (`write_signing_services_manifest`, `pulp_bootstrap.py`) - one entry per pending row
  (name, script path, fingerprint, class, GNUPGHOME) - onto the `scripts` volume **already shared**
  with `pulp` (`docs/signing.md` "Shared volume permissions"). No new volume, no new mount.
- The reconciler polls that manifest from inside the `pulp` container. For each entry not yet
  present in Pulp's own (loopback) signing-services list, it runs `pulpcore-manager
add-signing-service` locally via `subprocess.run` - no Docker client, no Kubernetes client, no
  network hop of any kind.
- `pulpit-core` keeps polling Pulp's signing-services list to detect completion
  (`refresh_pulp_service_status`, unchanged) and flip rows to `ACTIVE` - this part never cared _how_
  a service got registered, so it needed no change at all.
- The manual fallback (the printed `docker compose exec pulp pulpcore-manager ...` command,
  `build_bootstrap_command`) is unchanged, for anyone deploying vanilla `pulp/pulp:stable` instead
  of the derived image.
- `app/adapters/pulp/executor.py` (`PulpCommandExecutor`, `DockerExecExecutor`,
  `KubernetesExecExecutor`, `build_executor`) is deleted outright, along with its `docker`/
  `kubernetes` Python dependencies - there is no seam left to abstract over, since nothing in
  pulpit-core reaches into another container any more.
- The reconciler itself is stdlib-only Python (`json`, `subprocess`, `urllib.request`) -
  deliberately no `pip install` in the derived image, and no risk of pulpit-core's own dependency
  versions (FastAPI/SQLAlchemy/etc.) conflicting with pulpcore's own pinned versions inside the same
  Python environment.

## Alternatives considered

- **Keep the executor abstraction, just narrow it further**: doesn't remove the fundamental
  problem (a privileged cross-container capability, two divergent platform-specific
  implementations) or collapse the container count on Docker/Podman.
- **A Kubernetes CronJob (or sidecar) calling the Pulp API instead of exec'ing in**: rejected for
  the same reason moving Pulp's URL into an env var doesn't help - `add-signing-service` has no
  REST endpoint at all; a CronJob would still need to exec into the `pulp` pod, gaining nothing over
  `KubernetesExecExecutor`.
- **Fuse pulpit-core/pulpit-worker into this same derived Pulp image too** ("pulpit" becomes a pure
  UI shell): considered and rejected. pulpit-core/worker are a FastAPI/SQLAlchemy application with
  their own pinned dependencies; sharing one Python environment with pulpcore's own (Django, its own
  pinned versions) risks real dependency conflicts the reconciler's stdlib-only design specifically
  avoids. It would also re-introduce, at a much larger scope, exactly the coupling ADR 0007 already
  rejected for the whole app ("rebuilding on top of a moving target on every release instead of
  pulling `pulp/pulp:stable` directly") - here that risk would apply to every pulpit release, not
  just this one narrow reconciler. It further widens pulpit-core's own attack surface (nginx/API
  traffic colocated with Pulp's own secrets/database) and removes the resilience boundary where
  today a `pulp` restart doesn't take the UI/API down with it.

## Consequences

- Exactly 3 containers on every platform (`redis`, `pulp` (derived), `pulpit`) - Docker/Podman drop
  `docker-socket-proxy` entirely; Kubernetes drops its `ServiceAccount`/`Role`/`RoleBinding`
  entirely. All three deployment targets use the _same_ mechanism for the first time.
- One more image to build and publish per release (`.forgejo/workflows/release.yml`), tagged the
  same as `pulpit` itself - this ties rebuilding on top of whatever `pulp/pulp:stable` resolves to
  at build time to this project's own release cadence, not upstream Pulp's, the same tradeoff ADR
  0007 already accepted for not rebuilding Pulp's image at all, now slightly sharper since this ADR
  _does_ rebuild on top of it (a much smaller layer than the "alternatives considered" full-app
  fusion above, so the same class of risk at a far smaller scope).
- `pulpit-core`'s `docker`/`kubernetes` Python dependencies, and every Docker/Kubernetes-exec test,
  are gone - one less thing that can be affected by an unrelated `docker`/`kubernetes` package
  upgrade.
- A deployment that customizes `pulp`'s image (a private mirror, additional plugins, ...) now needs
  to layer those changes on top of (or alongside) `docker.io/simonverbois/pulp-pulpit` instead of
  vanilla `pulp/pulp:stable` to keep automatic signing-service registration - falling back to the
  manual command flow (unchanged) remains an option if that's not desired.
