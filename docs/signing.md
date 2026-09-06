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

Four tables, owned entirely by this module (`pulpit-core/app/modules/signing/models.py`):

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
package in the repository's latest version:

1. Confirms the repository actually has content (a repository at version 0 - never synced/uploaded
   - is skipped immediately, not treated as an error).
2. Publishes the repository and waits for it, so the metadata read next reflects exactly the
   packages in the current version.
3. Reads the distribution's own published `repodata/repomd.xml` → `primary.xml.gz` to build a
   checksum → real file path map. **VERIFIED live**: a package's own `location_href` field is
   **not** reliable for this - the default repository layout actually serves packages at
   `Packages/<first-letter>/<filename>`, which only exists in the generated metadata. This mirrors
   exactly what a real `dnf`/`createrepo`-compatible client does to resolve a package's URL.
4. Downloads each package through the distribution's own content-serving URL (the same path a real
   `dnf` client uses - never `/var/lib/pulp` directly), re-signs it locally with `rpmsign` using the
   new key (pulpit-worker has the same shared GNUPGHOME the on-upload signing script uses), and
   re-uploads the result as a new content unit via Pulp's normal package-upload endpoint.
5. Swaps every old unit for its resigned replacement in **one** `modify()` call (one new repository
   version for the whole batch, not one per package), then republishes so the distribution actually
   serves the resigned content.

This necessarily gives every resigned package a new checksum and creates a new repository version -
not a lightweight operation. A repository requires at least one **distribution** for this to work at
all (step 3/4 need somewhere to fetch published content from); a repository with content but no
distribution fails this job with a clear, actionable error rather than silently doing nothing.

**VERIFIED end-to-end** against a live instance: a real repository's 35 packages were downloaded,
signed with a real key, and re-uploaded successfully; a downloaded resigned package showed a real,
correctly-attributed `RSA/SHA256` signature under the new key's ID via `rpm -K`.

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
   publishing. This step is unchanged from before ADR 0008 - it never cared *how* a service got
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

Resigning here only ever happens as an explicit consequence of an administrator publishing a signing
key - never automatically as a side effect of syncing new content from a remote. This module does
not decide which packages are trustworthy, run any vendor-signature/CVE/malware validation, or
change what's actually inside a package - it only changes whose signature is on it. It is explicitly
designed to leave room for a future, separate workflow (vendor-signature verification → CVE/malware
validation → approval → _then_ repository signing) - nothing here assumes or forces "sign everything
on sync."

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
*already* pointed at a signing service in sync automatically (`publish_key_job` walks every RPM
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
publish_repository_metadata` for anything newly metadata-signed) - a repository already correctly
configured is left untouched, never redundantly re-signed.

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
- **No progress reporting for a resign job in flight**: `resign_repository_packages_job` reports
  only a final `{"resigned": N, "skipped": N}` result, not per-package progress - for a repository
  with many thousands of packages, the only visibility while it runs is that the job is `running`,
  not how far along it is.
- **Not restart-safe mid-batch**: if `resign_repository_packages_job` is interrupted partway through
  a repository (worker crash/restart), a retry re-downloads and re-signs every package again rather
  than resuming - each resign produces a fresh signature, so this is wasteful but not incorrect, just
  worth knowing for a very large repository.
- **A package with content not yet reflected in published metadata is skipped, not resigned** - the
  job publishes once at the start specifically to minimize this window, but a package added between
  that publish and the metadata read would still be skipped (counted, logged, never resigned by that
  run) rather than blocking the rest of the batch.
- **Rescoping signing management to a specific Pulp role** (rather than "any authenticated Pulp
  user") is not implemented — see "Identity and access."
- **A single global signing identity**: this module manages one active key used across every
  repository that opts in (task's own stated default: "one global repository signing identity by
  default, not one private key per repository"). Per-repository distinct keys are not supported.
- **Automatic registration needs the derived Pulp image**: a deployment running vanilla
  `pulp/pulp:stable` instead of `docker.io/simonverbois/pulp-pulpit` gets the manual command flow
  (fully functional, just not automatic) - see "Automating the manual Pulp step" and ADR 0008.
