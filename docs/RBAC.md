# RBAC / permissions

Pulp owns users, groups, roles, and permissions — including object-level permissions on
individual repositories/distributions/etc. where the relevant plugin supports them. Pulpit has no
RBAC system of its own (ADR 0001).

## Pulp's model, as Pulpit consumes it

- **Users** and **Groups**: managed via pulpcore's user/group API.
- **Roles**: named bundles of permissions, assignable at the model level or (where supported)
  the object level, via pulpcore's roles API.
- **Object permissions**: some resources (e.g. a specific repository) can carry permissions
  scoped to just that object, on top of model-level roles.

Pulpit's `Access` section (Users / Groups / Roles) is a UI over these existing Pulp APIs — it
does not add a parallel concept of "Pulpit roles."

## How Pulpit should expose it

- **Access** pages (Users, Groups, Roles) manage Pulp's actual objects via Pulp's actual
  endpoints — no shadow copies, no Pulpit-side caching of "what a user can do" beyond normal
  TanStack Query caching of API responses.
- Where Pulp's API can tell us in advance whether the current user has a given permission (e.g. a
  reported capabilities/permissions field), the UI may use that to avoid presenting obviously
  unusable controls. This must be derived from what the API actually returns, never hardcoded or
  guessed per role name.
- Where that information isn't cheaply available, the UI attempts the action and handles a `403`
  response as a first-class, clearly-labeled outcome (see `docs/PULP_API.md`) rather than trying
  to precompute permissions client-side.
- Object-level permission management UI (e.g. "who can manage this specific repository") is only
  built once the corresponding Pulp object-permission endpoints have been inspected live — see
  the `pulp-api` skill. Until then it's tracked in `docs/ROADMAP.md`, not half-built.

## Explicitly out of scope

- A Pulpit-specific permission model, role names, or authorization checks that don't map directly
  to a Pulp permission/role.
- Client-side "fake" enforcement that isn't backed by the server actually rejecting the request —
  UI-level hiding of controls is a convenience on top of real API enforcement, never a substitute
  for it.
