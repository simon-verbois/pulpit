# Changelog

All notable changes to Pulpit are documented here, one section per release. Versions follow
Pulpit's own calendar scheme (`YYYY.WW.PATCH` — the ISO year/week of the release, then a patch
counter for same-week releases), tracked in [`VERSION`](VERSION) and shown in the app's own
footer.

## Unreleased

### Added

- Distribution base paths are now namespaced by content module (`rpm/`, `container/`,
  `ansible/`, and the equivalent prefix for every installed plugin). The create forms display the
  prefix as fixed URL text, while the derived Pulp image enforces the same rule for direct API
  requests before dispatching a task.

### Changed

- The "Grant access…" (repository/content-guard), "Add member…" (group), and "Assign role…"
  dialogs now use a searchable select for Users, Groups, and Roles instead of comma-separated
  text fields or an unconstrained native dropdown (previously rendering all ~180 built-in roles
  at once, unreadable on a shorter screen) — type to filter, selections stay visible as removable
  chips, and values can only come from Pulp's actual list, so a typo can no longer produce a
  broken grant.

### Removed

- The TLS FreeIPA provider, its certificate-request automation, guided setup, stored credentials,
  API routes, and Administration UI. Existing FreeIPA-issued certificates are retained as manually
  managed certificates during migration. TLS now has two paths: the two-year, automatically renewed
  self-signed fallback and manual certificate import.

## 2026.37.4 — 2026-09-07

### Added

- Administration → TLS: HTTPS on port 8443 alongside the existing 8080, with an
  automatically-generated (and auto-renewed before expiry) self-signed certificate out of the box
  — no configuration needed to get an encrypted connection.
- Manual certificate upload for port 8443, validated on submit (a mismatched key/certificate pair,
  an already-expired certificate, or unparseable PEM are all rejected with a specific reason); its
  expiry now surfaces as an Overview-page warning since there's no key material Pulpit can renew on
  its own behalf.
- A FreeIPA certificate provider: request and auto-renew a certificate from a FreeIPA CA using a
  dedicated automation account (password/session auth, not Kerberos/keytabs), with a guided setup
  wizard (one-time IPA administrator credentials, never persisted — only the new automation
  account it creates is saved) and documented manual setup steps for anyone who'd rather not hand
  over an admin password even transiently ([`docs/tls.md`](docs/tls.md)).
- Administration → LDAP: configure Pulp's own LDAP authentication backend (server/bind/user and
  group search/attribute mapping), applied via the same colocated-reconciler mechanism already
  used for repository signing, plus a "Test connection" check that binds directly against the
  directory before you apply anything.
- `GET /pulpit-core/api/v1/health` now reports per-component status (database, Pulp, background
  worker) instead of a bare "ok", for external monitoring — the HTTP status code itself still
  reflects only the database, so an external Pulp outage can't trip Kubernetes/Podman's liveness
  probe into restarting Pulpit over a problem restarting it can't fix.

### Changed

- The FreeIPA and LDAP settings forms (and the FreeIPA guided-setup wizard) now collapse everything
  but the essential fields into an "Advanced settings" section instead of showing every field at
  once.
- The Overview page's Warnings card now aggregates multiple sources (Pulp version compatibility, an
  expiring TLS certificate) instead of only ever showing Pulp compatibility issues.
- `fixture_seed` (sample content on first boot) now defaults to disabled instead of enabled —
  opt in with `PULPIT_CORE_FIXTURE_SEED_ENABLED=true` if you want it.
- Every "Create distribution" modal's URL preview now uses Pulp's actual configured
  `CONTENT_ORIGIN` instead of assuming the browser's own origin, so it matches what Pulp really
  assigns whenever the two differ.
- Repository version lists and repository-by-name lookups across every content type, the signing
  keys list, and repository content-size totals now poll every 15 seconds, so a change triggered
  elsewhere (another session, the Pulp scheduler, an API caller) shows up without a manual refresh.
- The "Generate signing key" dialog now closes itself once the new key appears instead of waiting
  for the admin to click Close, and the repository-signing "pending Pulp setup" warning now only
  appears once a service has been stuck past its normal ~30s registration window instead of
  immediately.
- Documentation (`README.md`, `docs/AUTHENTICATION.md`, `docs/PULP_API.md`, `docs/DEPLOYMENT.md`,
  `docs/ROADMAP.md`) updated to reflect that LDAP authentication and TLS termination, added above,
  are implemented — they were previously described as future work / architecturally-supported-but-
  unconfigured.

### Fixed

- A PatternFly v6 layout gap where a page shorter than the browser viewport left the outer page
  background visible below the content card, all the way down to the footer.

## 2026.37.2 — 2026-09-07

### Added

- Every "Create distribution" modal now shows the distribution's actual resulting URL live — a
  greyed, fixed origin/path prefix with only the editable suffix, instead of an opaque "Base
  path" field — and no longer asks for a separate Name (both are globally-unique free-text
  identifiers on Pulp's side already, so the base path doubles as the name).
- Automatic secret generation for a first deploy: `deployment/docker/generate-env.sh` for Docker,
  and both Podman's and Kubernetes' `deploy.sh` now generate `PULP_SECRET_KEY`,
  `PULPIT_CORE_SECRET_KEY`, and a random admin password on first run instead of requiring manual
  `openssl rand`/secret-file editing.
- Backend static analysis: ruff and mypy, wired into CI, for `pulpit-core` (previously untested
  by any linter or type checker).
- Container-level resource requests/limits, security-context hardening
  (`allowPrivilegeEscalation: false`, dropped capabilities), and consistent image-tag pinning
  across all three deployment targets (Docker Compose, Podman, Kubernetes).
- Kubernetes' `deploy.sh` guards against accidentally applying the placeholder
  `00-secret.example.yaml` via a directory glob.

### Changed

- The active tab on every repository/user/group detail page now lives in the URL instead of
  component state, so it survives a hard reload (F5) instead of resetting to the first tab.
- Left-nav sections (RPM, Debian, ...) now expand/collapse independently and stay open across
  navigation, instead of every other open section collapsing whenever you navigate to a page
  outside it.
- ~55 list pages across every content type now correctly hide their toolbar/search bar alongside
  the empty state, instead of showing it above an empty list.
- Distribution tables no longer show a Copy button next to the URL/pull command — the text is
  already selectable — and the Delete button's resulting misalignment is fixed too.
- Ansible Roles/Collections, Container Tags, and Npm/Gem/Maven/Hugging Face content search, and
  Signing Services search, now fetch the full list and filter/paginate client-side, since Pulp
  exposes no substring filter at all for those endpoints.
- Removed a batch of dead API-client code across most content-type modules (unused by-href
  getters, `deleteRepositoryVersion`, unused content-guard create/update variants,
  `listAllXRepositories`).
- Docker's SQLite permission fix in the entrypoint is now a deterministic convergence loop
  instead of two fixed `sleep` windows.

### Fixed

- RPM Packages and Python content search sent an invalid Pulp filter (`name__icontains`, which
  Pulp doesn't support for those two endpoints) that silently left the previous, unfiltered page
  on screen instead of an error or real matches — now uses the valid `name__contains`.
- Distribution URLs (`base_url`/`client_url`/`registry_path`) came back as bare paths, or with the
  wrong container-registry hostname/port, instead of a usable absolute URL — `CONTENT_ORIGIN`,
  `ANSIBLE_API_HOSTNAME`, and `PYPI_API_HOSTNAME` are now configured on Pulp, and nginx forwards
  the real `Host` header (including port) instead of stripping it.
- Below roughly 1085px of window width, the entire left navigation disappeared with no way to
  reopen it — the toggle button had been removed on the assumption the sidebar was always shown,
  which isn't true below that width. Reinstated the standard toggle, only visible at/below that
  breakpoint.
- Edit/Delete action buttons stacked vertically instead of sitting on one line, on the Namespaces
  and Access → Roles pages.
- The "core" pseudo-component no longer shows in the Overview page's component table (it isn't a
  content plugin — always a blank Repositories/Size); its version is still checked for
  compatibility warnings.
- Any authenticated user, not just staff, could read and overwrite the instance-wide default
  proxy credentials.
- `fixture_seed` now respects a new opt-out setting instead of always running with privileged
  credentials against eight external hosts on every deployment.
- The repository signing policy endpoint, and the retired/retiring signing-key lookup endpoint,
  required no authentication at all.
- nginx's unlimited request-body size applied to the whole server instead of just the
  upload-handling routes.
- Hardened the RPM signing macro against a latent shell-metacharacter injection path.
- Several `e2e` specs still referenced Administration sub-routes removed by the merged
  Administration page (ADR 0010).

## 2026.36.4 — 2026-09-04

### Added

- Default Settings and every Remote's connection settings now support a CA certificate
  (`ca_cert`), applied directly to Pulp's own per-Remote trust anchor — replaces the previous
  "Trusted CA certificates" module, which copied certificates into Pulp's container-wide OCI
  trust store instead. One less moving part, no loss of feature for the user.
- Podman deployment via plain `podman play kube` manifests
  ([`deployment/podman/`](deployment/podman/README.md)) — not a Compose wrapper — and a
  Kubernetes deployment via plain manifests, no Helm
  ([`deployment/kube/`](deployment/kube/README.md)). Both verified live, alongside the existing
  Docker Compose reference topology.
- This changelog, linked from the app's own footer.

### Changed

- nginx, pulpit-core, and pulpit-worker now ship as a single `pulpit` container image (previously
  three) — see ADR 0007. pulpit-core's own database defaults to embedded SQLite, so no separate
  database service is required to deploy Pulpit anymore.
- Finished the OpenAPI type-generation pipeline (ADR 0004): component-scoped schemas, generated
  types checked into version control, and a compile-time drift check against every hand-written
  API type.
- Every deployment target (Docker Compose, Podman, Kubernetes) reorganized under one
  [`deployment/`](deployment/README.md) directory, one README per technology, instead of being
  scattered across the repository root.

### Fixed

- The Save button on the Default Settings page is now disabled until there are unsaved changes,
  instead of always being clickable.
- Password managers no longer offer to autofill unrelated fields (proxy credentials, user
  emails/passwords, content guard secrets, ...) outside the login page.

## 2026.36.2 — 2026-09-03

### Added

- Administration → Default Settings page, with an auto-applied default proxy for new Remotes.
- Version and license shown in a fixed page footer.
- `compose-dev.yml` split from `compose.yml`, for building `pulpit` from local source instead of
  pulling the published image.

### Changed

- CI: Postgres now provisioned as a real service for pulpit-core's test suite, reached by service
  name rather than `localhost`; placeholder secrets added for the Compose config-validation step;
  npm/pip caching dropped from the quality job.

### Fixed

- Ansible Roles, Collections, and Container Tags search now matches on substring ("contains"),
  not just prefix.
- Unsupported plugins are labeled "Not implemented", not the more alarming "Not verified".
- The Help drawer's title now stays fixed while its content scrolls.
- Removed the System status page — a strict subset of the Overview page's own content.

## 2026.36.1 — 2026-09-03

Initial release.

### Added

- Pulpit SPA (React/TypeScript, PatternFly): RPM, Container, Ansible, Access, Tasks, and
  Administration feature areas, backed live by the Pulp API.
- pulpit-core and pulpit-worker (ADR 0006): a narrowly-scoped backend for capabilities that
  structurally cannot live in a browser or in Pulp's own API, starting with repository/package
  signing key custody and lifecycle.
- Docker Compose reference deployment topology (Pulp + Pulpit).
- Forgejo CI/CD: quality gate and release pipeline, including a sanitized public GitHub mirror.
- Playwright end-to-end specs.
- Full project documentation: architecture, API integration strategy, authentication/RBAC, UX
  conventions, testing strategy, security posture, and architecture decision records.
