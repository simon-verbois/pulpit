# Changelog

All notable changes to Pulpit are documented here, one section per release. Versions follow
Pulpit's own calendar scheme (`YYYY.WW.PATCH` — the ISO year/week of the release, then a patch
counter for same-week releases), tracked in [`VERSION`](VERSION) and shown in the app's own
footer.

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
