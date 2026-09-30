# Repository/package signing

This document covers the signing module (`pulpit-core/app/modules/signing/`) end to end: what it
does, how it's built, the exact Pulp mechanisms it relies on (verified against a live instance, not
assumed), its trust model, and how to operate it. See ADR 0006 for why pulpit-core/pulpit-worker
exist at all, ADR 0007 for why they (and nginx) now run inside one `pulpit` container instead of
three, ADR 0008 for how the one Pulp-side administrative step this module needs is automated, and
`docs/ARCHITECTURE.md` for how they fit into the wider system.

## What this module does

- Generates and manages the lifecycle of a GPG signing key used to sign RPM packages and/or
  repository metadata (`repomd.xml`).
- Talks to Pulp's own, already-supported signing mechanisms (`core.SigningService`,
  `rpm.RpmRepository.package_signing_service`/`package_signing_fingerprint`/
  `metadata_signing_service`) for signing new content, and to Pulp's own content-serving/upload/
  modify APIs (never `/var/lib/pulp` directly) to resign content that already exists — Pulp remains
  authoritative for artifacts, content records, and checksums throughout.
- Maintains **exactly one active, published signing key** at a time. The public key URL always
  serves that one key — never an old-and-new mix.
- **Publishing a key is mandatory, not a toggle**: it re-signs every already-existing package (in
  every repository with package signing enabled) and republishes metadata (in every repository with
  metadata signing enabled) under the new key. There is no setting to disable this.
- **Detects new synced content and resigns it automatically**: a scheduled job notices when a
  repository's Pulp repository version has moved on and incrementally resigns only what's new -
  never a full repository re-scan for a normal sync (see "Incremental resigning after sync"). An
  idempotency cache (`rpm_signing_cache`) and a per-repository watermark
  (`signing_repository_sync_state`) make this, and every other resigning path, cheap to re-run,
  crash-resumable, and safe to call redundantly.
- Runs all of this on a schedule and as background jobs — never inline in an HTTP request.
- Automates the one Pulp-side administrative step it cannot do over Pulp's REST API (registering a
  `core.SigningService`) via a small reconciler colocated inside a derived Pulp image (ADR 0008),
  falling back to a manual, printed command when that reconciler isn't present.

## Everything it deliberately does NOT do

- It does not decide _which_ packages should exist in a repository, verify licenses, or replace any
  vendor/CVE/malware-scanning workflow. It signs what Pulp already has, once told to.
- It does not create a second identity/auth system — see "Identity and access" below.
- It does not keep an old key's public key served indefinitely "just in case" - publishing a new key
  replaces the served key immediately, precisely so a repository's client configuration never needs
  a second trusted key hanging around (see "Public key distribution").

## Architecture recap

```
Browser --(session cookie)--> pulpit (nginx) --(same origin)--> pulpit-core API
                                       \_______________ same "pulpit" container (ADR 0007) ______/
                                                                       |
                                                        embedded-SQLite-backed job queue
                                                                       |
                                                                 pulpit-worker
                                                          /                          \
                                                    GPG (GNUPGHOME)                Pulp REST API
                                                          |                    (repo fields, signing-
                                                          |                    services, upload/modify,
                                                          |                          publish)
                                                          |                              |
                                                           \                             |
                                                            \                            |
                                                                    pulp container (ADR 0008)
                                                    (runs on-upload signing scripts; also runs the
                                                     colocated signing-service reconciler, which
                                                     reads a manifest off the shared scripts volume
                                                     and registers services locally - no exec in)
```

pulpit-core (the API process) never has the GPG volume mounted, never imports the GPG-executing
code (`gpg_local.py`, `rpm_resign.py`), and never reaches into the `pulp` container at all (ADR
0008 removed that entirely) - see ADR 0006 and "Security model" below. GPG access lives only in
pulpit-worker, a separate OS process (uid/gid 700) within the same container as pulpit-core since
ADR 0007 - see that ADR for how the two stay isolated from each other despite sharing a
container/filesystem.

## Data model

Six tables, owned entirely by this module (`pulpit-core/app/modules/signing/models.py`):

- `signing_settings` — one row, all administrator-configurable values (task requirement: nothing
  here is hardcoded to an organization name; defaults are just defaults — see "Configuration"
  below).
- `signing_keys` — one row per generated key: `state` (`next`/`active`/`retiring`/`retired`),
  fingerprint, key id, identity, algorithm, **public** key armor, timestamps. No private key
  material, ever (enforced structurally — there is no column for it, and
  `tests/unit/test_schemas_no_private_key.py` / `test_signing_key_model_has_no_private_key_column`
  guard against it being reintroduced).
- `signing_pulp_services` — tracks the Pulp-side `core.SigningService` object(s) this module
  depends on, its bound `fingerprint`, and whether it's registered yet (see "Automating the manual
  Pulp step").
- `signing_rotations` — an audit trail of key lifecycle events.
- `rpm_signing_cache` — the `(source_sha256, fingerprint) -> signed_content_href` idempotency cache
  used by `resign_repository_packages_job` (see "Incremental resigning after sync" below). Not a
  second source of truth for repository content — Pulp's own repository version content and a
  package's `signing_keys` field remain authoritative; this table only accelerates lookups, makes
  the resign job idempotent, and lets a crash resume without redoing already-finished work. Not
  scoped to a repository: the same upstream RPM (identical `source_sha256`) can appear in many
  repositories, and a resign done once is reusable by every one of them.
- `signing_repository_sync_state` — one row per repository: the highest Pulp repository version
  number whose content has already been evaluated by a clean (zero-failure) resign run. This is the
  watermark both the post-sync detector and the `apply-to-all` sweep use to decide whether a
  repository has anything left to do.

## Key lifecycle

```
        generate                 publish                 retention window elapses
   ────────────────►  NEXT  ────────────────►  ACTIVE  ──(superseded)──►  RETIRING  ──────────►  RETIRED
                                                   │                          │
                                    used for new signing;          resign/republish jobs
                                 existing content resigned          may still be finishing;
                                     under it on publish            no longer served/used
```

Never "delete the old key, make a new one." Publishing a key is the one operation that moves it to
`ACTIVE` and the previous active key to `RETIRING` — see "Publishing: what actually happens" below
for everything that triggers. `RETIRING` is a historical/audit state only under the current
single-key model (unlike an earlier coexistence design this module no longer uses): the old key's
public key is **not** kept served once a new key is published. A `RETIRING` key is marked `RETIRED`
after `key_retention_days` (default 180) purely for record-keeping.

The very first key generated on a fresh install has nothing to publish over - it publishes
immediately once whatever Pulp signing services it needs are ready (see below), skipping the NEXT
step's normal "wait for the publish threshold" behavior.

## Publishing: what actually happens

"Publish" (`POST /pulpit-core/api/v1/signing/keys/{id}/publish`, or automatically via the rotation
schedule) is more than a state flip. `publish_key_job` (`app/modules/signing/jobs.py`):

1. Confirms every Pulp signing service this key needs is registered and active (see "Automating the
   manual Pulp step") - if not, it leaves the key `NEXT` and retries later rather than partially
   publishing.
2. Repoints every repository currently using package signing at the new fingerprint (cheap - see
   "Package signing vs. metadata signing"), and every repository using metadata signing at a new
   Pulp signing service (also cheap - metadata resigning is just a normal Pulp publish, see below).
3. Flips key state (`NEXT` → `ACTIVE`, previous `ACTIVE` → `RETIRING`).
4. **Enqueues one `signing.resign_repository_packages` job per affected repository** - the
   expensive, mandatory part.
5. **Enqueues one `signing.publish_repository_metadata` job per affected repository** for metadata
   - Pulp regenerates and signs `repomd.xml` on every publish natively, so this is just triggering a
     normal Pulp publish; no custom logic needed.

Steps 4 and 5 are jobs, never run inline with the publish itself - a slow resign on one repository
never blocks activating the key or resigning any other repository, and each is independently
retryable/trackable like any other job.

### How resigning existing packages actually works

Pulp has **no API to re-sign a package already in a repository in place** (package signing is
on-upload only - see "Known limitations"). `resign_repository_packages_job` therefore, for every
**candidate** package (see "Incremental resigning after sync" for how the candidate set is scoped
down from "the whole repository"):

1. Confirms the repository actually has content (a repository at version 0 - never synced/uploaded
   - is skipped immediately, not treated as an error).
2. Publishes the repository and waits for it, so the metadata read next reflects exactly the
   packages up to and including the current version.
3. Lists candidate packages - either every package in the current latest version (a first-time pass
   or a key rotation), or only what pulpcore's `repository_version_added` filter reports as added in
   each version between the job's `since_version` and `target_version` (a normal post-sync delta,
   see below) - and drops any whose own `signing_keys` field already lists the active fingerprint
   (Pulp itself already signed them correctly, nothing to do).
4. Looks up every remaining candidate's `(source_sha256, fingerprint)` in `rpm_signing_cache` in
   **one** batched query. A `success` row with a `signed_content_href` is reused directly - no
   download, no `rpmsign`, no re-upload, just a swap of that already-known content unit into the
   repository. A `running` row younger than 15 minutes means another job/worker is already on this
   exact source package (the cache is keyed by content, not by repository) and is left alone this
   run. Anything else (a genuine miss, a `failed` row, or a stale `running` row from a crashed
   worker) becomes a real candidate to sign.
5. Reads the distribution's own published `repodata/repomd.xml` → `primary.xml.gz` to build a
   checksum → real file path map for whatever still needs signing. **VERIFIED live**: a package's
   own `location_href` field is **not** reliable for this - the default repository layout actually
   serves packages at `Packages/<first-letter>/<filename>`, which only exists in the generated
   metadata. This mirrors exactly what a real `dnf`/`createrepo`-compatible client does to resolve a
   package's URL.
6. Downloads, re-signs, and re-uploads each remaining candidate **in parallel** across
   `settings.rpm_signing_workers` threads (default 8, see "Parallel resigning" below) - each result
   is written to `rpm_signing_cache` and committed as soon as it completes, not batched, so a crash
   partway through loses at most the in-flight work.
7. Swaps every old unit for its resigned (or cache-reused) replacement in **one** `modify()` call
   (one new repository version for the whole batch, not one per package), then republishes so the
   distribution actually serves the resigned content. The repository served to clients therefore
   only ever flips from "fully previous" to "fully current" - never a partially-resigned in-between
   state.
8. If every candidate this run covered succeeded, advances `signing_repository_sync_state`'s
   watermark to `target_version` - a repository is never silently considered "fully signed" while
   any of its candidates failed; the same version range is retried on the next detection/apply-to-all
   pass instead.

This necessarily gives every newly-resigned package a new checksum and creates a new repository
version - not a lightweight operation, though a run with only cache hits (or no candidates at all)
skips the upload/modify/publish steps entirely. A repository requires at least one **distribution**
for this to work at all (steps 5/6 need somewhere to fetch published content from); a repository
with content but no distribution fails this job with a clear, actionable error rather than silently
doing nothing.

**VERIFIED end-to-end** against a live instance: a real repository's 35 packages were downloaded,
signed with a real key, and re-uploaded successfully; a downloaded resigned package showed a real,
correctly-attributed `RSA/SHA256` signature under the new key's ID via `rpm -K`.

## Incremental resigning after sync

Repository sync (an RPM remote pulling new upstream content) happens entirely between Pulpit's
frontend and Pulp directly (ADR 0005) - pulpit-core is never in that request path the way it is for
signing-specific actions, so there is no request hook here to react to when a sync finishes. Two
consequences follow directly from that:

- **Pulp's on-upload package signing does not cover synced content.** It only actually signs
  content created through Pulp's upload pipeline - a package pulled in by a remote sync keeps
  whatever signature it already had (e.g. a vendor/EPEL key), even on a repository with
  `package_signing_service`/`package_signing_fingerprint` correctly configured. Resigning
  already-existing content (the mechanism described above) is therefore not just a rotation-time
  operation - it is also how newly-synced packages actually end up under Pulpit's key at all.
- **A scheduled job has to detect the delta itself, on a poll.** `detect_repository_content_changes_job`
  (`app/modules/signing/jobs.py`, `module.py`'s `scheduled_jobs`, every 60s) pages through every RPM
  repository, and for each one that has package signing configured (`package_signing_service` and
  `package_signing_fingerprint` both set), compares its current `latest_version_href` against
  `signing_repository_sync_state`'s watermark. A repository that has moved on gets an incremental
  `signing.resign_repository_packages` job enqueued with `since_version`/`target_version` set to
  exactly the version range that needs evaluating - a repository synced from version 51 to 52 gets a
  job scoped to "whatever `repository_version_added` reports for version 52", not a re-scan of the
  whole repository. A repository the detector has never seen before (no watermark row at all) gets a
  first, full pass instead - still cheap per-package thanks to the `signing_keys`/cache checks in
  the mechanism above, just not scoped to a specific version.

This means the workflow for a normal sync is: **sync completes on Pulp's side → within the next
detection interval, Pulpit notices `latest_version_href` moved → an incremental resign job signs
only what's new → the repository is modified and republished in one atomic step.** Trust-model note:
resigning a synced package is not "laundering" its original vendor signature silently - it is a
deliberate, logged, and cache-recorded consequence of that repository having package signing enabled
at all (see "Trust model" below), the same policy `apply-to-all`/key publishing already apply to
existing content.

`_enqueue_resign_job` (jobs.py) deduplicates by `(repository_href, fingerprint)` before enqueuing -
`has_matching_pending_job` (`app/core/jobs/service.py`) checks every currently queued/running
`signing.resign_repository_packages` job's payload, so a repository already awaiting or undergoing a
resign never gets a second, redundant one queued on the next detection tick.

### Parallel resigning

The download/`rpmsign`/upload step for whatever isn't a cache hit runs across a
`concurrent.futures.ThreadPoolExecutor` sized by `Settings.rpm_signing_workers`
(`PULPIT_CORE_RPM_SIGNING_WORKERS`, default **8**, minimum **1** - enforced by a `ge=1` constraint,
since a pool of size 0 would silently hang the job forever). Each worker only does I/O and a
`subprocess.run` call - it never touches the database. All `rpm_signing_cache`/
`signing_repository_sync_state` writes happen on the main thread as each worker's result comes back
(`as_completed`), so there is never more than one write in flight and no `Session` is ever shared
across threads. Raise this for a large repository (EPEL-sized, tens of thousands of packages) on a
host with headroom; lower it if GPG or Pulp itself becomes the bottleneck instead.

## Package signing vs. metadata signing

These are **not** the same mechanism, and publishing does not need to treat them identically -
confirmed by reading pulpcore's/pulp_rpm's actual source, not assumed:

- **`core.SigningService` is immutable.** pulpcore raises `RuntimeError("The signing service is
immutable...")` on any attempted update (`@hook(BEFORE_UPDATE)` in `pulpcore/app/models/
content.py`) — a signing service's bound key can never change; a new one must be created.
- **Package signing (`RpmPackageSigningService`)**: the fingerprint is supplied **explicitly on
  every call** (`RpmPackageSigningService._env_variables` deliberately nulls out the service's own
  bound fingerprint and requires the caller to pass one — verified from `pulp_rpm/app/models/
content.py`). Pulp does this using the repository's own `package_signing_fingerprint` field.
  **This means one generic, long-lived package-signing service is enough forever** — publishing a
  new key only ever updates `package_signing_fingerprint` on repositories, never the Pulp
  SigningService object itself (`app/modules/signing/jobs.py`'s
  `_apply_package_fingerprint_everywhere`). This same override is also how a downloaded package gets
  resigned with a specific key regardless of which fingerprint the shared package-signing service
  itself happens to be bound to.
- **Metadata signing (`AsciiArmoredDetachedSigningService`)**: there is no such override — the
  service's own bound fingerprint is what actually gets used for `repomd.xml`. **Every metadata-key
  publish therefore registers a brand-new `core.SigningService`** and repoints every repository's
  `metadata_signing_service` at it (`_repoint_metadata_service`); the old one is left in place (Pulp
  `on_delete=PROTECT`s it anyway while any repository still points at it) with status `superseded`
  in `signing_pulp_services`.

## Automating the manual Pulp step

Pulp's `core.SigningService` has **no create/update/delete REST endpoint at all** — verified against
the live OpenAPI schema (`docs/PULP_API.md`: "`signing-services/` is read-only"). The only way to
create one is `pulpcore-manager add-signing-service`, a Django management command that must run
**inside the Pulp process** (it needs Pulp's own GPG-key validation and database access).

Earlier versions of this project automated this by having `pulpit-worker` exec into the `pulp`
container from the outside (a scoped Docker socket proxy under Compose/Podman, the Kubernetes API's
`pods/exec` subresource under Kubernetes). ADR 0008 replaced both with a small reconciler that runs
**inside a derived Pulp image** instead - see that ADR for the full rationale (it collapses the
topology to 3 containers on every platform and removes a real, previously-audited privilege
entirely, rather than just scoping it down further).

- `docker.io/simonverbois/pulp-pulpit` (`deployment/docker/pulp/Dockerfile`) is
  `docker.io/pulp/pulp:stable` plus one added s6-overlay longrun service:
  `pulpit-signing-reconciler` (`deployment/docker/pulp/pulpit-signing-reconciler`, stdlib-only
  Python - no pip install, no dependency-tree conflict with pulpcore's own).
- It polls a desired-state manifest (`signing-services.json`, one JSON object per pending row: name,
  script path, fingerprint, class, GNUPGHOME) that `pulpit-worker` writes onto the `scripts` volume
  **already shared** with `pulp` (see "Shared volume permissions" below - no new volume, no new
  mount). For each entry not yet present in Pulp's own (loopback) signing-services list, it runs
  `pulpcore-manager add-signing-service` **locally** - no exec, no socket, no Kubernetes API call of
  any kind, since it's already running in the same container/process context Pulp needs this in.
- `compose.yml`, `deployment/podman/pulp.yaml`, and `deployment/kube/pulp.yaml` all reference this
  same image now - the mechanism is identical across every deployment target for the first time
  (previously Docker/Podman and Kubernetes needed two entirely different code paths).
- **A deployment running vanilla `pulp/pulp:stable`** (not the derived image) simply never gets a
  reconciler reading the manifest - the row stays `PENDING_MANUAL_SETUP` exactly as before, and the
  GUI/API keep surfacing the manual command below. Automation is strictly additive, never a hard
  dependency, same as the executor approach it replaced.

Flow (`signing.check_pulp_bootstrap` job, run on a schedule and after every key/settings change):

1. When a new key needs a Pulp signing service, pulpit-core computes the exact command, both as a
   manifest entry (for the reconciler) and as a shell-quoted display string (`bootstrap_command`,
   stored on `signing_pulp_services` - every argument `shlex.quote`d so a copy-pasted
   malicious-looking name can't inject a second command).
2. It (over)writes the full manifest of every currently pending row - an atomic replace
   (`write_signing_services_manifest`, `pulp_bootstrap.py`), never an incremental patch, so a row
   that just became `active` naturally drops out on the very next write.
3. It polls Pulp's (read-only) signing-services list; as soon as it sees the new name (registered
   by the colocated reconciler or by an administrator), it flips the row to `active` and resumes
   publishing. This step is unchanged from before ADR 0008 - it never cared _how_ a service got
   registered.
4. If the derived image isn't in use, or the reconciler hasn't gotten to it yet, `GET
/pulpit-core/api/v1/signing/keys/{key_id}/pulp-services` keeps surfacing the exact command for an
   administrator to run **inside the `pulp` container**:
   ```sh
   docker compose exec pulp pulpcore-manager add-signing-service \
     'Pulp RPM Signing Service' /var/lib/pulpit-signing/scripts/sign_rpm_package.sh \
     <fingerprint> --class rpm:RpmPackageSigningService --home /var/lib/pulpit-signing/gnupg
   ```
   (metadata services use `--class core:AsciiArmoredDetachedSigningService`, the default - omit
   `--class` entirely, as pulp_rpm's own docs do). **The `--home` flag is required** - without it,
   the command looks for the key in its own default `~/.gnupg` (empty) and fails with "No public
   key"; this was a real bug caught live before the flag was added everywhere it's built.

**VERIFIED end-to-end**: built `deployment/docker/pulp/Dockerfile`, booted it standalone, and
confirmed s6 starts `pulpit-signing-reconciler` alongside Pulp's own longruns before Postgres/Pulp
itself even initializes - the same "one persistent supervised process" model as every other
service in that image.

## Public key distribution

`GET /keys/<public_key_filename>` (default `RPM-GPG-KEY-pulp`, configurable, unauthenticated,
proxied straight through nginx — `deployment/docker/nginx/pulpit.conf.template`) serves **only the current
ACTIVE key's** public key. There is deliberately no old+new coexistence: publishing a key resigns
existing content and republishes metadata under it (see above), so there is no transition window
where a client needs to trust two keys for this repository's content at once, and the URL a
repository's `gpgkey=` points at never needs to change.

Generated DNF configuration (what the GUI's "copyable DNF configuration" produces):

```ini
[pulpit-repo]
name=Pulpit-managed repository
baseurl=https://<host>/pulp/content/<distribution base path>/
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://<host>/keys/RPM-GPG-KEY-pulp
```

**Trust bootstrapping is not automatic.** The first time a DNF client encounters this key at all (a
fresh install, or `gpgcheck` on a repo it's never used before), `dnf`/`rpm` will still prompt for
interactive approval of the key's fingerprint (or require `--nogpgcheck`/`assumeyes=1`/an
out-of-band-verified fingerprint in automation). **Because the served content is replaced, not
appended to, on every publish**, a client that already trusts the _previous_ key and hasn't
refreshed since the last publish will fail verification until it re-imports the new one - automatic
publishing keeps the **server side** consistent; it does not, and cannot, guarantee unattended trust
propagation to every client. Document the fingerprint (shown in the Administration → Repository
Signing GUI) through whatever out-of-band channel your organization already uses to distribute trust
roots, and plan for a real rollout window around a publish if clients can't tolerate re-importing a
key on short notice.

## Identity and access

pulpit-core has no user/session store of its own (ADR 0006). Every signing API request is
validated by forwarding the caller's existing cookie/Basic-auth header to Pulp's own
`GET /pulp/api/v3/login/` (`app/core/auth.py`) — the same check Pulpit's frontend already performs.
Any Pulp user who can authenticate at all can currently manage signing settings; scoping this to a
specific Pulp role/permission is a reasonable follow-up (`docs/RBAC.md`'s "derive from what the API
actually returns, never hardcoded" applies here too) but is not implemented in this first pass.

## Configuration

Every value below is a runtime, administrator-editable field on `signing_settings`
(`PATCH /pulpit-core/api/v1/signing/settings`) — the values in `pulpit-core`'s own config
(`app/core/config/settings.py`, `PULPIT_CORE_SIGNING_*` env vars) are only the **seed defaults**
used the first time the settings row is created, never hardcoded organizational identity:

| Field                           | Default                         |                                                                                                                   |
| ------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `key_name`                      | `Pulp Repository Signing Key`   | Display name only                                                                                                 |
| `identity_name`                 | `Pulp Repository Signing Key`   | GPG UID name                                                                                                      |
| `identity_email`                | _(empty)_                       | Optional GPG UID email                                                                                            |
| `algorithm`                     | `rsa4096`                       | `rsa2048`/`rsa3072`/`rsa4096`/`ed25519`                                                                           |
| `validity_days`                 | 730                             | Also: 6mo/1y/2y/3y/5y/custom via the GUI, or none if `allow_indefinite_validity`                                  |
| `public_key_filename`           | `RPM-GPG-KEY-pulp`              | Served at `/keys/<this>`                                                                                          |
| `rpm_signing_service_name`      | `Pulp RPM Signing Service`      | Pulp SigningService name                                                                                          |
| `metadata_signing_service_name` | `Pulp Metadata Signing Service` | Base name; each publish appends the key id                                                                        |
| `auto_rotation_enabled`         | `false`                         | Master switch for scheduled generate/publish below                                                                |
| `rotation_generate_before_days` | 90                              | Generate a NEXT key this many days before ACTIVE expires                                                          |
| `rotation_activate_before_days` | 30                              | Publish the NEXT key this many days before ACTIVE expires                                                         |
| `key_retention_days`            | 180                             | How long a RETIRING key is kept before being marked RETIRED (record-keeping only - see "Public key distribution") |
| `allow_indefinite_validity`     | `false`                         | Must be enabled before a non-expiring key can be generated                                                        |

`pulpit-worker` evaluates the rotation thresholds every 5 minutes (`signing.rotation_check` job -
`worker/main.py`), never inline in a request. The pure threshold logic lives in
`app/modules/signing/rotation.py` and is unit-tested in isolation (`tests/unit/test_rotation.py`)
from the I/O that acts on its decisions - a separate integration test
(`tests/integration/test_rotation_datetime_roundtrip.py`) exercises the same logic against a real
database round trip, which is what actually caught a real naive-vs-timezone-aware datetime bug
in-session (see "Known limitations" - fixed, kept as a regression test).

One additional value is a `pulpit-core`/`pulpit-worker` process config setting, not a
`signing_settings` field (it controls resource usage, not signing policy, so it isn't
administrator-editable at runtime the way the table above is):

| Setting               | Env var                           | Default | Notes                                                                              |
| --------------------- | --------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `rpm_signing_workers` | `PULPIT_CORE_RPM_SIGNING_WORKERS` | 8       | Thread pool size for parallel resigning (`ge=1`) - see "Parallel resigning" above. |

## Security model

- **Private key material** lives only in the `pulpit_signing_gnupghome` Docker volume, mounted
  into the `pulpit` container (readable only by pulpit-worker's own uid/gid 700 inside it, never
  by pulpit-core/nginx running as a different identity in that same container - ADR 0007) and
  `pulp` (see "Shared volume permissions"). It is never returned by any API response, never
  rendered in the GUI, never logged, and never present in pulpit-core's own database — enforced by
  construction (no column, no import of the GPG-executing code outside pulpit-worker) and by tests
  (`tests/unit/test_schemas_no_private_key.py`).
- **Subprocess safety** (`app/modules/signing/gpg_local.py`, `rpm_resign.py`): every `gpg`/`rpmsign`
  invocation is a fixed argument list (`subprocess.run([...], shell=False)`), never a shell string.
  Identity name/email, algorithm, and fingerprint are validated against strict allow-lists/regexes
  _before_ they reach an argument — an identity name containing shell metacharacters, newlines, or
  GPG batch-file syntax is rejected outright, not escaped-and-hoped.
- **Passphrase-less keys**: `pulpit-worker` generates keys without a passphrase, because it must
  sign non-interactively with no human present — the same constraint pulpcore's own documented
  signing scripts have. This is a real, deliberate trade-off: whoever can read
  `pulpit_signing_gnupghome` can sign as this key. Mitigated by: the volume is mounted only into
  `pulpit-worker` and `pulp`, restrictive file permissions (`0700`, never world-readable), and the
  `KeyManager` abstraction (`key_manager.py`) — a future HSM/Vault/cloud-KMS backend can require no
  local private-key file at all without changing any of the module's business logic.
- **Shared volume permissions** (`deployment/docker/pulpit/entrypoint.sh`, ADR 0007 - previously
  `pulpit-core/worker/entrypoint.sh`, before pulpit-worker had its own separate container/image):
  VERIFIED by inspecting a running `docker.io/pulp/pulp:stable` container, `pulpcore-worker` (the
  process that actually executes signing scripts) runs as uid/gid **700** — not root. The `pulpit`
  container's entrypoint runs as root only long enough to `chown`/`chmod` the two shared volumes to
  `700:700` (mode `0700` for the GNUPGHOME, `0755` for the scripts, which aren't secret), then
  drops privileges to uid/gid 700 itself (`setpriv --reuid=700 --regid=700`) before running the
  actual worker-loop process (nginx and pulpit-core, started by that same entrypoint, run as their
  own separate, non-700 identities instead - ADR 0007). Both `pulp` and the worker loop therefore
  see the same numeric uid/gid on the shared volumes without either one being root or the volumes
  being world-accessible.
- **No cross-container privilege at all** (ADR 0008, "Automating the manual Pulp step" above):
  unlike the Docker-socket-proxy/Kubernetes-`pods/exec` approach this replaced, `pulpit-worker`
  never reaches into the `pulp` container, and nothing reaches into it from the outside either - the
  colocated reconciler only ever runs `pulpcore-manager` locally, inside the same container Pulp
  itself needs it in.
- **Redaction**: GPG/rpmsign operation failures are truncated (last ~500 chars of stderr) before
  being stored as a job's `error` field or logged — long enough to diagnose, capped to avoid
  accidentally persisting something unexpected at length. `worker/main.py`'s job loop logs
  `str(exc)` only, never a full traceback that could include environment/argument dumps.

## Trust model: re-signing is not laundering vendor trust silently

If a package originally signed by a vendor is re-signed under Pulpit's own key, clients ultimately
trust **the repository signing key**, not the original vendor signature:

```
Vendor package -> Pulp / validation -> repository signing -> client trusts the repository key
```

Resigning here only ever happens as an explicit, logged consequence of a repository having package
signing enabled at all — either an administrator publishing/rotating a key (`publish_key_job`,
`apply_signing_to_all_repositories_job`), or, since "Incremental resigning after sync" above, the
scheduled detector noticing new synced content on a repository already opted into package signing.
**This is a deliberate policy, not an accident**: earlier versions of this module resigned only on
key publish/rotation and left newly-synced content under its original vendor signature indefinitely
(a real bug — Pulp's on-upload signing does not apply to synced content at all, so a repository
could show `package_signing_service`/`package_signing_fingerprint` fully configured while every
actual package still carried e.g. an upstream EPEL signature). Nothing here decides which packages
are trustworthy, runs any vendor-signature/CVE/malware validation, or changes what's actually inside
a package — it only changes whose signature is on it, and only for a repository an administrator has
already turned package signing on for. It is explicitly designed to leave room for a future, separate
workflow (vendor-signature verification → CVE/malware validation → approval → _then_ repository
signing) — package signing being enabled is the explicit approval gate that already exists; nothing
here resigns a repository that hasn't opted in.

## Backup and recovery

- **`pulpit_core_pgdata`** (settings/key metadata/job history/audit trail): back up like any other
  application Postgres database (`pg_dump`, volume snapshot, etc.).
- **`pulpit_signing_gnupghome`** (the actual private key): back this up too, and treat the backup
  with the same sensitivity as the live volume — restricted access, encrypted at rest if your
  backup target supports it. **If this volume is lost without a backup, the private key is gone
  permanently** (there is no server-side copy anywhere else, by design — see "Security model").
- **Recovery after key loss**: generate a new key (`POST .../signing/keys/generate`) and publish it
  the same way a scheduled rotation would (the automated-or-manual Pulp signing-service step, then
  publish) — there is no way to recover the lost key's ability to sign new content, only to replace
  it. Publishing resigns/republishes everything under the new key, so recovery does not leave
  permanently orphaned content signed only by the lost key.

## How to disable signing

Signing is fully automatic per repository, not an opt-in exposed anywhere in the GUI -
`package_signing_enabled`/`metadata_signing_enabled` being on is the only thing that decides
whether a repository gets signed, applied the same way to every repository (new ones at creation;
existing ones via the bulk `apply-to-all` sweep below).

`PATCH /pulpit-core/api/v1/signing/settings {"package_signing_enabled": false}` (or the equivalent
GUI checkbox) stops new repositories from being created with package signing configured, and stops
`rotation_check_job` from taking any further automatic action for it (`signing_enabled: false`
covers the scheduler as a whole). It does **not** retroactively unset
`package_signing_service`/`metadata_signing_service` on repositories already configured for it -
that is a per-repository, explicit action (`POST .../signing/repositories/configure` with
`sign_packages: false`, not currently surfaced anywhere in the GUI), consistent with never mutating
a repository's Pulp configuration as a side effect of an unrelated global setting change.

## How to bring existing repositories under the current key

`POST /pulpit-core/api/v1/signing/keys/generate` and normal rotation already keep every repository
_already_ pointed at a signing service in sync automatically (`publish_key_job` walks every RPM
repository, VERIFIED live via the same `list_rpm_repositories` pagination as everything else here).
What that does NOT cover is a repository that predates signing being turned on at all, or was
created while it was off - nothing ever points its `package_signing_service`/
`metadata_signing_service` at anything, so it stays unsigned indefinitely on its own.
`POST /pulpit-core/api/v1/signing/repositories/apply-to-all` (staff-only; "Sign all repositories…"
in the GUI, Administration → Repository Signing) is the explicit, on-demand sweep for exactly this
case - `apply_signing_to_all_repositories_job` walks every RPM repository the same way, applies the
current active key's services to any repository not already using them, and schedules the same
mandatory resign/republish follow-through `publish_key_job` does (`signing.
resign_repository_packages` for anything newly package-signed, `signing.
publish_repository_metadata` for anything newly metadata-signed).

**Configuration conformance and content conformance are checked independently.** A repository's
`package_signing_service`/`package_signing_fingerprint` already matching the active key's services
used to be treated as "nothing to do here" - which is wrong: a repository can be perfectly
configured and still contain packages that were never actually resigned (e.g. `signing_keys: null`
on every package, the exact production bug this sweep exists to fix), because configuring signing
and actually resigning existing content are two different operations (see "Incremental resigning
after sync"). `apply_signing_to_all_repositories_job` now also consults
`signing_repository_sync_state` (the same watermark the post-sync detector maintains): a repository
whose content has already been fully covered by a clean resign run is left alone even on a repeat
sweep (this is what keeps re-running `apply-to-all` a true no-op once everything is caught up,
rather than resigning every RPM every time), while one that's never been touched, or whose content
has drifted ahead of the watermark, gets a `signing.resign_repository_packages` job regardless of
whether its Pulp fields needed a PATCH. That job's own `signing_keys`/cache checks then decide,
per-package, what actually needs (re-)signing - so selecting a repository here is cheap even when it
turns out nothing in it actually needed touching.

### Re-signing a single repository

When one repository didn't end up fully signed (a failed resign job, a
signing-service hiccup, a PATCH that never landed), `POST
/pulpit-core/api/v1/signing/repositories/resign` with `{"repository_href": ...}` ("Re-sign now"
on the repository's Overview tab, shown whenever package or metadata signing is enabled globally)
fixes just that one repository:

1. Re-applies the current policy's signing services/fingerprint to the repository with the
   **caller's own** Pulp credentials, exactly like `/configure` - Pulp's object permissions decide
   whether this user may change this repository at all. A refused PATCH queues nothing.
2. Queues a **full** `signing.resign_repository_packages` pass (no `since_version`, ignoring the
   sync-state watermark) whose payload carries the PATCH's Pulp task as `configure_task`; the job
   waits for that task before doing anything, and fails if it didn't complete. Every package in
   the latest version is checked against the active fingerprint; the result's `evaluated` count
   is how many were checked, `candidates` how many weren't signed with it. A metadata-only policy
   queues `signing.publish_repository_metadata` instead.
3. If a resign job for this `(repository, fingerprint)` is already in flight, that job is returned
   instead of a duplicate - and if it's still queued as an incremental (post-sync) pass, it is
   widened to a full one.

The job shows up in the Tasks drawer and on the Tasks page's **Background jobs** tab
(`GET /pulpit-core/api/v1/jobs`: newest first, staff see every job, anyone else only their own,
periodic heartbeat jobs hidden unless `include_scheduled=true`), with the repository it acts on and
its final result counts.

## How to rotate/publish manually

`POST /pulpit-core/api/v1/signing/keys/generate` to create a NEXT key on demand, then
`POST /pulpit-core/api/v1/signing/keys/{id}/publish` to publish it immediately rather than waiting
for the scheduled threshold — both surfaced as GUI actions ("Generate key" / "Publish now") under
Administration → Repository Signing.

## Known limitations

- **RPM package signing (on-upload, native Pulp behavior) is Tech Preview** as of pulp_rpm 3.38.5 -
  new content synced/uploaded after a repository is configured for package signing is signed by
  Pulp itself as part of its normal ingest pipeline. Resigning _already-existing_ content (this
  module's own `resign_repository_packages_job`) works around the lack of a native re-sign API by
  downloading/re-signing/re-uploading, as described above - it is real and verified working, but is
  not a Pulp-native operation and inherits pulp_rpm's own Tech Preview status for the underlying
  signing mechanism.
- **`package_signing_fingerprint` is normalized by Pulp**: VERIFIED live against pulpcore/pulp_rpm
  in this project's reference versions — writing a plain 40-character hex fingerprint is accepted,
  but Pulp echoes it back prefixed (`v4:<hex>`) on subsequent reads. This module always _writes_ the
  plain form and treats the field as an opaque string otherwise (never string-compares it against a
  freshly generated fingerprint), so this doesn't affect correctness, but don't assume the two
  forms are interchangeable if you extend this code.
- **Progress is logged, not exposed through the job API**: `resign_repository_packages_job` logs a
  structured `RPM resign progress ...` line roughly every 5 seconds while workers are running
  (repository, counts so far, rate) and a final structured summary, but a job's `result` field (and
  therefore the GUI's Jobs view) still only shows the final counts once the job completes - there is
  no live progress field on the `Job` row itself.
- **Restart-safe at the package level, not at the in-flight-batch level**: a crash loses at most the
  packages whose signing was still running in a worker thread at that moment (their `rpm_signing_cache`
  row is a stale `running`, retried automatically next time) - every package that already reached
  `success` or `failed` is never redone. What is _not_ preserved across a crash is the in-progress
  `modify()`/publish step itself: if the worker dies after signing finishes but before the final
  `modify()` call, the next run re-evaluates the same candidates (all now cache hits) and re-issues
  `modify()`/publish cheaply - correct, just not literally free.
- **A package with content not yet reflected in published metadata is skipped, not resigned** - the
  job publishes once at the start specifically to minimize this window, but a package added between
  that publish and the metadata read would still be skipped (counted, logged, not counted as a
  _failure_ either) rather than blocking the rest of the batch. Because this isn't a failure, the
  repository's sync-state watermark still advances past it - a future run scoped only to later
  versions won't naturally re-examine it; a real, if narrow, gap that a manual `apply-to-all` run (or
  the next key rotation, which always does a full pass) closes.
- **The post-sync detector polls, it does not subscribe to a real "sync completed" signal**:
  because repository sync is issued directly against Pulp by the frontend (ADR 0005), pulpit-core
  has no request-time hook to react to. `detect_repository_content_changes_job` instead compares
  `latest_version_href` on a 60-second interval (`module.py`), which means there is up to ~60s of
  latency between a sync completing and its new packages actually being queued for resigning - not
  instantaneous, but bounded and cheap (one repository listing per tick, no per-package work unless
  something changed).
- **`rpm_signing_cache` grows without bound**: every distinct `(source_sha256, fingerprint)` pair
  ever resigned gets a permanent row; nothing here prunes rows for content that's since been removed
  from every repository or for a fingerprint that's long retired. Harmless functionally (indexed
  lookups stay fast at realistic scale), just worth knowing before assuming the table is small.
- **Rescoping signing management to a specific Pulp role** (rather than "any authenticated Pulp
  user") is not implemented — see "Identity and access."
- **A single global signing identity**: this module manages one active key used across every
  repository that opts in (task's own stated default: "one global repository signing identity by
  default, not one private key per repository"). Per-repository distinct keys are not supported.
- **Automatic registration needs the derived Pulp image**: a deployment running vanilla
  `pulp/pulp:stable` instead of `docker.io/simonverbois/pulp-pulpit` gets the manual command flow
  (fully functional, just not automatic) - see "Automating the manual Pulp step" and ADR 0008.

## Authorization and interrupted jobs

Global signing configuration and key mutations require a Pulp staff account.
Individual repository configuration uses the caller's own Pulp credentials for the
PATCH; a background job tracks any returned task. A synchronous response is
recorded as an already successful job. Credentials are not saved.
A job interrupted by worker termination is reported failed at restart. Review the
actual key and repository state before retrying; external effects may already exist.
One worker per core database is enforced by a lifetime lock, including on PostgreSQL.
