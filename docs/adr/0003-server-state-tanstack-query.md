# ADR 0003: TanStack Query owns server state

## Status

Accepted

## Context

Almost all data in Pulpit originates from Pulp's API: repositories, content, remotes, tasks,
users, groups, roles, status. This is "server state" — it can go stale, needs caching,
refetching, retry, and invalidation, and is fundamentally different from local UI state (open
modal, selected table filter, form draft).

Mixing the two in a single global store (e.g., Redux holding a manually-synced copy of Pulp data)
tends to produce bespoke, bug-prone cache-invalidation logic — exactly the kind of "second source
of truth" ADR 0001 tries to avoid, just inside the frontend process instead of a backend.

## Decision

Use **TanStack Query** for all data fetched from Pulp: repositories, versions, content, remotes,
users/groups/roles, tasks, and the status endpoint. Centralize query key construction (e.g.
`src/api/client` or a small `queryKeys` module per feature) so invalidation is consistent.

Task completions (see `docs/PULP_API.md` and the `pulp-tasks` skill) invalidate the query keys
for whatever resources that task affected, so the UI reflects Pulp's real state without manual
refresh.

Local, UI-only state (current filter text, pagination page, open drawer, form draft) stays in
React component state or context — it is not routed through TanStack Query or a global store.

No Redux, MobX, or Zustand by default. If a genuine cross-cutting client-state need emerges later
that React state/context can't reasonably serve, it gets its own ADR justifying the addition
rather than being added quietly.

## Alternatives considered

- **Redux (or MobX/Zustand) as the single source of truth**: requires hand-written caching,
  refetching, and invalidation logic that TanStack Query already provides, and blurs the
  server-state/UI-state distinction. Rejected as a default.
- **Fetch-in-`useEffect` per component**: no shared caching, easy to create duplicate requests
  and inconsistent loading/error handling across the app. Rejected.

## Consequences

- Every feature needing Pulp data adds query hooks (and mutation hooks that invalidate the right
  keys) rather than dispatching actions to a global store.
- Loading/empty/error state handling can be made consistent app-wide (shared
  `LoadingState`/`EmptyState`/`ErrorState` components) because TanStack Query's status model is
  uniform across features.
- Adding a global client-state library later is possible but requires a new ADR and a concrete,
  demonstrated need — not a default reach.
