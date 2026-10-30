# ADR 0013: Enforce RPM signing before publication and delivery

Status: Accepted — 2026-10-29

The previous re-sign job published repository metadata to discover downloadable package paths,
then fetched, signed and uploaded RPMs from pulpit-core. That initial publication could expose
unsigned packages. A periodic detector could not prevent this window, and sync did not apply
Pulp's native on-upload signing to on-demand content.

The derived Pulp image now includes `pulp-rpm-signing-policy`. It prepares configured signatures
in repository-version finalization, using Pulp's original RemoteArtifact downloaders and native
RPM signing service/cache. Publication finalization verifies package membership and the actual
PublishedArtifacts; configured metadata signing also requires its detached signature. Delivery
checks run before the Redis response cache, preserving existing content guards.

Pulpit retains key lifecycle management, caller-authorized configuration and job orchestration.
Re-sign requests native preparation through an empty modify operation, verifies the resulting
version and waits for publication. No distribution is needed to download source bytes. Network
pagination and task polling do not hold a core SQLite writer; deduplication and queue insertion
use a short serialized transaction.

On-demand RPMs that need signing must be downloaded before exposure: signing changes checksums,
so signing the first requested RPM without rebuilding metadata would serve inconsistent bytes.
Signing failures preserve the previous safe publication. Old unsigned pinned versions remain
unavailable until explicitly repinned; immutable version semantics are preserved.

Both images must be upgraded. A missing plugin causes safe re-sign to fail with an actionable
error. The hooks are verified against the installed Pulp versions and require integration checks
on dependency upgrades. The historical core cache table is retained without new writes; no
migration deletes existing data.
