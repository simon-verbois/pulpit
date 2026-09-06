# ADR 0009: Pulpit-native nav-visibility settings (not a Pulp permissions mirror)

## Status

Accepted

## Context

The user asked for a "dynamic interface" - only show a user the parts of the UI they're meant to
use, based on their account's permissions. Three designs were considered before this one:

1. **Live per-object `my_permissions/` checks, reacting to 403s.** Pulp exposes no instance-wide
   "list everything this user can do" endpoint - only a per-object `my_permissions/` (VERIFIED live,
   `docs/PULP_API.md`), so proactively deciding "should the RPM nav group show at all" would mean
   probing at least one RPM object per page load, and non-CRUD action codenames (sync/publish/
   modify) aren't enumerated anywhere in this codebase to check against. Reactive 403 handling
   (`PulpApiError` already classifies status 403 as `kind: "forbidden"`) needed zero new plumbing
   and remains the correct behavior for individual actions - this ADR doesn't replace it, it adds a
   coarser layer on top for whole nav *sections*.
2. **Mirror Pulp's own permission tables into pulpit-core's DB, kept in sync.** Rejected: Pulp has no
   webhook/event system for permission changes, so staying in sync would mean either reading Pulp's
   Postgres directly (breaking this project's own "Pulp is a REST-API-only black box" stance, ADR
   0006/0007) or polling every object for every user - more API calls than the per-object check in
   (1), for a cache that can lag a real revocation. A stale *authorization* cache is a security bug,
   not just a UX one - unacceptable for a system with no Pulp-side invalidation signal at all.
3. **This ADR's design**: pulpit-native settings, entirely independent of Pulp's own RBAC state,
   admin-configured, storing only "which whole nav sections to hide" - never "who can do what".

An earlier cut of this same design stored the allow-list per Pulp group (`NavModuleGroupRule`), plus
a per-user override table (`NavModuleUserOverride`) that could force-show or force-hide a module
regardless of the user's groups - configured from a "View" tab on each Group's and User's own detail
page. That was replaced by the single global setting described below: in practice every group ended
up needing the same section checked, the per-user override was never actually used to make one
regular user see something no other regular user did, and one global list configured once in
Administration is simpler to reason about and to explain ("everyone sees X") than resolving
group-grants-then-user-overrides for every page load.

## Decision

Add a `nav_visibility` pulpit-core module, following the same shape as `default_settings`
(its own SQLAlchemy table/migration/Pydantic schemas/service/routes - `docs/adr/
0006-pulpit-core-backend.md`'s "each module owns its own tables"):

- **Global, default-visible, and no staff bypass**: `NavVisibleModule(module_id)` - presence of a
  row means that whole nav section (`"RPM"`, `"Maven"`, ...) is explicitly granted to **every**
  signed-in user, instance-wide, staff included. An EMPTY grant set - nothing ever configured, or
  every box unchecked - means unrestricted: everyone sees everything. An administrator must
  explicitly grant a specific, non-empty subset in Administration's General tab to restrict
  anyone to less than everything - and doing so restricts every user equally, including whichever
  staff account is doing the configuring. (Two earlier cuts of this table: one made empty mean
  "show nothing" - reversed after user feedback: "il faut que tout soit en show par défaut"
  (everything must be shown by default); the other kept empty-means-unrestricted but exempted
  staff from restriction entirely via an `is_staff` bypass in `resolve_visible_modules` - removed
  after further feedback: "ça s'applique à tout le monde, donc à l'admin aussi" (it applies to
  everyone, including the admin) - a staff account testing this screen by unchecking a box and
  saving must see that box's effect on its own sidebar immediately, not just on other accounts',
  or the setting doesn't feel "real".) There is no per-group, per-user, or per-role distinction:
  every user always sees the exact same set.
- `module_id` is a free string on pulpit-core's side, matched against `navTree.ts`'s own stable
  per-`NavGroup` `id` (the single source of truth for "what modules exist" - deliberately not
  duplicated as a second enum server-side, same reasoning as ADR 0004 keeping exactly one source of
  truth per shape rather than two that can drift). One direct consequence: pulpit-core can no longer
  compute a final hidden-set itself (that would require knowing every module id there is, to take
  the complement of a grant-set - exactly the enumeration this ADR already refuses to duplicate
  server-side). `GET .../nav_visibility/me` therefore returns `visible_module_ids: string[] | null`
  (the globally granted set, or `null` for "unrestricted") and `AppNav.tsx` - which already holds
  the full `NAV_TREE` - does the actual show-only-these-ids filtering itself, never pulpit-core.
- Resolution (`GET .../nav_visibility/me`, called by `AppNav.tsx`): an empty grant set resolves to
  `null` (default-visible, see above), and a non-empty grant set restricts the caller - EVERY
  caller, no exceptions - to exactly those modules. Fails open on every axis (no data yet, or an
  error, both resolve to `null`) - same policy as the existing capability-based gating
  (`deriveCapabilities`), and correct here for the same reason: this is UI convenience, never the
  security boundary. A restricted-away section's pages remain reachable by direct URL and still
  enforce Pulp's own real permissions unchanged. This route (`routes/resolved.py`) depends only on
  `require_authenticated_user` (`CurrentUser`, one Pulp round trip) - it has no reason to fetch
  `is_staff` at all any more, unlike the settings route below.
- Admin management (`GET`/`PUT .../nav_visibility/settings`) is the **first `is_staff`-gated
  route in pulpit-core** (`require_staff_user`, `app/core/auth.py`) - no prior route checked any
  admin-ish flag at all. `is_staff` is the only administrator-shaped flag Pulp's API actually
  exposes on a user record; `is_superuser` is filterable on the Users list endpoint but is not a
  field on `UserResponse` at all (VERIFIED live), so it can't be used here. This gate is about who
  may CHANGE the list, not what it applies to once changed - see Decision above.
- Frontend: a "General" tab on the merged Administration page (`AdministrationPage.tsx`, one page
  with a `Tabs` per former standalone admin page - `docs/adr/0010-merged-administration-page.md`),
  building its checklist directly from `navTree.ts`'s own `NAV_VISIBILITY_MODULES` (derived, not a
  second hand-written list) so a future plugin module is automatically configurable with no extra
  wiring. `Administration` itself is a plain top-level nav item (not one of the checkable modules,
  same as `Overview`/`Tasks`) - once logged in, any authenticated user can reach it, same as before
  this ADR existed; the real gate on actually *changing* the settings is the staff-only backend
  route above.

## Alternatives considered

See Context above for the two rejected designs (live-403-only with no coarser layer; a synced
permissions mirror) and this ADR's own earlier per-group/per-user cut (superseded, see Context).
A third option - deriving nav visibility from Pulp's own Role/RoleAssignment objects directly (e.g.
"hide RPM if no group holds any `rpm.*` role at all") - was also considered and rejected: it
conflates "has zero granted permissions" with "chose to declutter this section", which aren't the
same thing, and it would require pulpit-core to understand every plugin's own role-naming convention
to compute, reintroducing the per-plugin codename problem option (1) above already ran into.

## Consequences

- A second, independent authorization-*adjacent* concept now exists in the UI: Pulp's own RBAC
  (real enforcement, via 403s) and pulpit's nav-visibility settings (UI convenience, via this
  module) can disagree without either being "wrong" - a user can see a nav section un-granted while
  still holding real Pulp permissions for it (reachable by direct URL), or vice versa (granted in
  the nav, then 403s the moment an action is attempted). This is by design, not a defect to fix -
  see Decision above - but it must never be described as "permissions" in the UI, only
  "visibility"/"sections", to avoid the false impression that granting or restricting a section
  actually changes anything real.
- The default-visible behavior means every user sees the full plugin sidebar the moment they log
  in, on a fresh instance - there is no way, through this screen, to lock anyone out of every
  section at once (unchecking everything reverts to "unrestricted" rather than "nothing"); an
  administrator can still restrict everyone to a specific subset by checking only those, and that
  restriction applies to staff accounts too, including whichever one is doing the configuring.
- pulpit-core gained its first admin-only gate (`require_staff_user`). Any future admin-only feature
  should reuse this dependency rather than inventing a second staff/admin check.
- `navTree.ts`'s per-group `id` is now a stored, cross-referenced key (in pulpit-core's own DB rows)
  - renaming one (distinct from renaming the *label*, which stays free - see the Debian/NPM
    relabeling history) silently orphans whatever rule was configured against the old id. Treat
    `id` as append-only, same caution as a database column name.
