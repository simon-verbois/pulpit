# ADR 0010: One merged Administration page, tabbed by former page

## Status

Accepted

## Context

Administration used to be a `NavExpandable` group in the left sidebar with 4 separate
standalone pages, each its own route: Repository Signing (`/admin/repository-signing`), Pulp
Signing Services (`/admin/signing`), Content guards (`/admin/content-guards`), and Default
Settings (`/admin/default-settings`). None of these are large or frequently visited enough on
their own to justify 4 separate nav sub-items and 4 separate page loads - they're all
instance-wide, admin-only configuration, conceptually one "Administration" area, not 4
unrelated features (unlike, say, RPM's Repositories/Packages/Advisories, which really are
distinct object types with their own lists).

This merge also created the natural home for a new "General" tab: the nav-visibility settings
(docs/adr/0009-nav-visibility-settings.md), now a single global allow-list rather than a
per-group/per-user one, needed exactly this kind of instance-wide admin settings page - it
didn't fit as its own top-level nav item, and there was no other natural home for it once the
per-group/per-user "View" tabs (on Group/User detail pages) were removed.

Access (Users/Groups/Roles) was folded in immediately after, for the same reason: it's also
instance-wide, admin-facing configuration with no plugin-specific content of its own (unlike
RPM/Debian/... which are genuinely separate object domains), so it doesn't need its own
top-level nav slot either.

## Decision

- `AdministrationPage.tsx` is the one route (`/admin`) for everything that used to be 4
  standalone admin pages plus the whole Access area. It renders a single `PageHeader` +
  PatternFly `Tabs` (`mountOnEnter` - see Consequences), one tab per former page, in this
  order: **General** (new - `NavVisibilitySettingsSection.tsx`, the nav-visibility allow-list),
  **Access** (Users/Groups/Roles, as its own nested sub-tabs - see below), Repository Signing,
  Pulp Signing Services, Content guards, Global Proxy Settings.
- Users/Groups/Roles are one **Access** tab, not 3 separate top-level tabs - they're all
  instance-wide account/permission configuration with no plugin-specific content, so they
  belong under one heading the same way this whole page merges 4 formerly-standalone admin
  pages under one nav item. A second, nested `Tabs` (also `mountOnEnter`) inside the Access
  `Tab` holds Users/Groups/Roles; `AdministrationPage`'s own `PageHeader` actions still resolve
  to whichever of the three is the CURRENT sub-tab (`AdministrationHeaderActionContext.tsx`'s
  registry is keyed by "users"/"groups"/"roles" regardless of nesting, so this needed no change
  there).
- The active tab (and, on Access, the active sub-tab) lives in the URL's query string
  (`?tab=...&subtab=...`), not `location.state` or component state - VERIFIED: router state
  does not survive a hard reload (F5), so a refresh always reset back to General; the URL does.
  Switching tabs calls `setSearchParams(..., { replace: true })` (no back-button history entry
  per tab click, but the current tab always matches the address bar and survives a reload).
- The former page components (`UsersPage`, `GroupsPage`, `RolesPage`, `RepositorySigningPage`,
  `SigningPage`, `ContentGuardsPage`, `DefaultSettingsPage`) are unchanged internally except
  their own `<PageHeader>` is removed (the merged page's header covers all of them) and, where
  the page-wide "Create X" action used to live in that `PageHeader`'s `actions` slot, it's now
  registered into `AdministrationHeaderActionContext` and rendered by `AdministrationPage`'s own
  header instead (CLAUDE.md "Page-wide actions live in the page header (top right), not in a
  toolbar"). Their own test files are unchanged otherwise, since they still export the same
  named component and can still be rendered standalone in a test (via `renderApp`'s
  `withAdministrationHeaderAction` option).
- Users' and Groups' own **detail** pages (`/access/users/:username`, `/access/groups/:name`)
  are NOT part of this merge - they stay separate routes, linked to from the Users/Groups
  sub-tabs exactly as before, since they're deep, tabbed detail views that don't fit as an
  admin-page tab themselves (mirrors how a plugin's own repository detail page is a separate
  route from its list page). Deleting a user/group navigates back to
  `/admin?tab=access&subtab=users` (or `groups`) so the caller lands back on the right sub-tab
  instead of always resetting to General.
- `navTree.ts`: `administration` changed from a `NavGroup` (4 children) to a plain `NavLeaf`
  pointing at `/admin` - no more expand/collapse chevron, a single click like
  `Overview`/`Tasks`. The `access` `NavGroup` was removed outright. Consequence:
  `Administration` is no longer one of `NAV_VISIBILITY_MODULES` (that list only derives from
  `NavGroup`s) - it's always shown to any authenticated user, same as `Overview`/`Tasks`. The
  real gate stays server-side: writing to any of these settings still requires the same
  permission each already had (staff-only for nav-visibility, authenticated for the others -
  unchanged by this merge).
- `docs/help`: the `access` category was folded into `administration`'s own page list (its
  `pathPrefix` is now `["/admin", "/access"]` - `getHelpLocationForPath` supports an array of
  prefixes for exactly this: one category, routes under two unrelated path families). Users'
  and Groups' help pages keep their `path` (`/access/users`, `/access/groups`) since the detail
  routes there still exist and still deserve a precise deep-link; every other former page (the
  4 admin ones, plus Roles, which has no detail route at all) lost its `path` - there's no
  longer a distinct URL to auto-detect from, and any bare `/admin` route falls back to this
  category's Overview topic.

## Consequences

- One page load instead of up to 5 (4 admin pages + Access) for anyone visiting more than one
  admin setting in a session - a real, if minor, improvement.
- `Tabs` uses `mountOnEnter` at both levels (the 6 top-level tabs and Access's 3 sub-tabs),
  several holding their own list/settings query - eagerly mounting all of them on every
  `/admin` visit would fire every one of those requests regardless of which tab is actually
  shown (this was harmless at 5 tabs, but became slow enough at 8 - before Access's sub-tabs
  were nested back down to 6 top-level tabs - to show up as flaky test timeouts under load - the
  same real cost applies in production, just less visibly). `mountOnEnter` mounts a tab's
  content only the first time it's selected, and keeps it mounted afterward so switching back
  doesn't re-fetch.
- Reloading `/admin` (or any bookmark/shared link into it) now lands back on the exact tab and
  sub-tab the URL names, not always General - a real UX bug this ADR's original `location.state`
  approach had (state only survives client-side navigation, not a hard reload).
- Help's "jump to the page matching my current route" no longer distinguishes between the 4
  merged admin tabs or Roles (no route of their own) - it lands on the category's Overview page
  instead, same as it already did for any other route with no more specific match. Users and
  Groups are the exception: their detail pages still deep-link precisely, since those routes are
  unchanged by this merge.
- A future 6th admin-only settings area should become a new tab here, not a new top-level nav
  item or a new standalone route - keeps this page as the one place instance-wide
  configuration lives.
