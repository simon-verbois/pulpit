# ADR 0014: Delete distributions with their repository

Status: Accepted — 2026-10-30

## Context

Upstream Pulp clears distribution targets when their repository disappears. Those unusable
URLs still reserve names and base paths. Pulpit’s owner requests deleting those URLs along
with the repository, including version- and publication-pinned distributions, across formats.

## Decision

The derived Pulp image installs a repository lifecycle policy through `pulpit-api-compat`.
Wrap native `Repository.delete`, collect distributions by real repository/version/publication
relationships in the same domain, and delete their concrete instances before native deletion
removes those relationships. Keep both operations inside one transaction.

Use native instance deletion to run plugin hooks and invalidate cached URLs. A failed delete
rolls back the database changes together. Existing Pulp DELETE endpoints, task dispatch and
repository authorization remain authoritative; repository-delete permission includes the URL
cascade. This works independently of the browser remaining open.

## Consequences

- The ordinary confirmation says that associated distributions are also deleted.
- Both Pulp and Pulpit images must be deployed together.
- Shared content guards, unrelated distributions and repositories remain intact.
- Package files are not force-deleted; native orphan cleanup and shared-content retention apply.
- Native container distribution deletion can already delete its repository. If it does, all
  remaining URLs for that repository follow this new policy too.
- Recovery remains available for orphan distributions left by older versions.
- Native tests cover direct/pinned targets, rollback, isolation and guard preservation; browser
  tests exercise the existing deletion controls against real Pulp across content formats.
