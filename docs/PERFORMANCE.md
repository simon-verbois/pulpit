# Pulp performance and capacity

Reviewed against official documentation and the local stack on 2026-10-05.
Capacity numbers in the [README](../README.md#estimated-hardware-requirements) are
planning estimates. There is no universal fastest configuration: optimize the
measured bottleneck while preserving responsiveness and successful syncs.

## What is verified here

**VERIFIED local:** pulpcore 3.116.1 / pulp_rpm 3.38.5; the local Pulp container
runs 2 task workers, 2 API workers and 2 content workers. Shipped Docker,
Kubernetes and Podman manifests have no container CPU/RAM caps or reservations.
The running local Pulp container retains its previous 2-CPU / 8-GiB cap until
it is recreated after the active ULN sync. PostgreSQL and Pulp processes share
the container's available resources.

**VERIFIED local:** Redis content caching is enabled; staging and artifact paths
(`/var/lib/pulp/tmp`, `/var/lib/pulp/media`) share one filesystem. UVLoop is off.
`KEEP_CHANGELOG_LIMIT=10`; sync pipeline limits are `MAX_CONCURRENT_CONTENT=200`,
`SYNC_MAX_IN_FLIGHT_MB=5120`, `SYNC_MAX_IN_FLIGHT_ITEMS=None`.

**VERIFIED local:** PostgreSQL uses `shared_buffers=128 MiB`,
`effective_cache_size=4 GiB`, `work_mem=4 MiB`, `max_connections=100`,
`max_wal_size=1 GiB`. These are an audit snapshot, not evidence that a specific
setting caused a slow page. No database restart or tuning was applied while the
ULN sync was running.

## Priorities to benchmark

1. **Separate API latency from download throughput.** Measure management API p50/p95
   during idle periods and during the intended number of syncs. Compare Pulp's
   response time with the proxy's time; examine PostgreSQL slow queries, disk
   latency, worker RSS, CPU throttling and outbound proxy/upstream limits. Skeleton
   rows make waiting clearer; they do not accelerate the backend.
2. **Keep the DB responsive.** Use low-latency SSD/NVMe for PostgreSQL and reserve
   memory for the database and filesystem cache instead of allocating everything
   to sync workers. On a dedicated DB server, PostgreSQL suggests 25% of RAM as a
   starting point for `shared_buffers`; do not blindly apply that percentage to
   the host RAM of this all-in-one container. `work_mem` can be used by several
   operations per connection, so increasing it globally can exhaust memory.
   Benchmark against the DB's budget and maintain autovacuum. See
   [PostgreSQL resource guidance](https://www.postgresql.org/docs/current/runtime-config-resource.html).
3. **Tune three different process pools.** `PULP_WORKERS` controls asynchronous
   tasks; `PULP_API_WORKERS` serves management requests; `PULP_CONTENT_WORKERS`
   serves downloads. Increasing task workers does not directly speed an API list
   or parallelize one sync across workers. Start with 2 task workers for a small
   server and 4 for the 16-vCPU/64-GiB planning example; increase only if peak
   memory and DB/storage throughput allow. Configure these under `pulp.environment`
   in a Compose override, not just in `.env`: the shipped Compose files do not
   currently forward these variables. The official
   [multi-process image reference](https://pulpproject.org/pulp-oci-images/docs/admin/reference/available-images/multi-process-images/)
   documents the separate controls. API/content/worker replicas can also scale
   independently in a split deployment. See
   [Pulp component scaling](https://pulpproject.org/pulp-operator/docs/admin/guides/install/ha/).
4. **Tune downloads separately.** A remote's `download_concurrency` controls
   simultaneous transfers inside its sync. As an experiment, try 4–8 for a slow
   authenticated/proxied source and 8–16 for a fast HTTP source, then compare
   throughput, upstream failures, staging usage and memory. These ranges are
   estimates, not Pulp defaults. Four syncs with concurrency eight can already
   produce approximately 32 outbound transfers. Do not assume raising both
   worker count and remote concurrency improves performance.
5. **Avoid unnecessary work.** Leave routine RPM sync optimization enabled so
   unchanged upstream metadata can skip work. Full syncs are appropriate for
   repair/diagnosis, including the current ULN recovery. Stagger repository
   schedules, and publish changed versions rather than continually publishing
   identical versions. Keep the RPM changelog limit aligned with client needs:
   lowering it reduces changelog availability, so it is a functional choice.
   See [RPM sync optimization](https://pulpproject.org/pulp_rpm/docs/user/tutorials/create_sync_publish/)
   and [RPM changelog settings](https://pulpproject.org/pulp_rpm/docs/admin/reference/settings/).
6. **Reduce storage work.** With local artifacts, keep `WORKING_DIRECTORY` and
   `MEDIA_ROOT` on the same filesystem to avoid staging copies. Redis
   `CACHE_ENABLED` caches content-location lookups, not every management API
   response. UVLoop is an optional content-serving experiment that requires the
   dependency in the image; verify a benefit before adding it. Pipeline limits
   such as `SYNC_MAX_IN_FLIGHT_MB` bound unpersisted downloads and must fit staging
   capacity; check installed-version support before copying settings from newer
   docs. See [Pulp settings](https://pulpproject.org/pulpcore/docs/admin/reference/settings/).
7. **Keep retention deliberate.** Old versions/publications and referenced
   superseded artifacts consume DB/storage capacity. Set retention to match
   rollback needs; use Pulp's supported cleanup after references are removed.
   Prefer paginated task/content API reads over retrieving entire histories.
   Schedule cleanup outside busy sync/publication windows.

## Example capacity override (not applied automatically)

For the README's **16-vCPU / 64-GiB host** example, the following is a starting
experiment for the existing single-container Pulp topology, not a validated
production preset:

```yaml
# compose.capacity.yml; combine with your normal Compose files.
services:
  pulp:
    environment:
      PULP_WORKERS: "4"
      PULP_API_WORKERS: "4"
      PULP_CONTENT_WORKERS: "4"
```

Budget memory for Pulp workers, its embedded database, Pulpit, Redis, the OS
and headroom. This example sets process counts only; it introduces no CPU/RAM
caps. More workers need a compatible DB connection budget. The example does not tune PostgreSQL: derive its settings
from measured database memory/IO needs and container shared-memory limits.
After validating representative repositories, compare one, two and four
concurrent syncs while testing client downloads. Stop increasing concurrency
when throughput flattens or API latency/memory use deteriorates.

Image/process-count/database changes may require restart. Finish or cancel active tasks before restarting
Pulp, keep their artifacts, and relaunch them afterwards. For larger sustained
loads, separate PostgreSQL, API/content and workers instead of treating the
reference all-in-one Compose stack as an unlimited production topology.
