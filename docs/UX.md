# UX conventions

Pulpit targets the feel of a modern Red Hat enterprise console (Ansible Automation Platform,
Private Automation Hub, Satellite, Hybrid Cloud Console): information-dense, desktop-first admin
tooling. Not a marketing site — favor tables and toolbars over cards and whitespace.

## Navigation

```
Overview

Repositories
    RPM        -> Repositories, Packages, Advisories, Remotes, Alternate sources
    Containers -> Repositories, Tags, Remotes
    Ansible    -> Repositories, Collections, Roles, Remotes, Namespaces, Search

Tasks

Access
    Users, Groups, Roles

Administration
    Repository Signing, Pulp Signing Services, Content guards, Default Settings
```

"Repository Signing" (pulpit-core, ADR 0006/`docs/signing.md`) manages the GPG key used to sign
RPM packages/metadata and its automatic rotation. "Pulp Signing Services" is the pre-existing,
unrelated, read-only view of whatever `core.SigningService` objects exist on the Pulp server
(any content type, not just RPM) - kept as a separate page rather than merged, since one is a
managed Pulpit feature and the other is a raw view of Pulp's own state.

RPM has no top-level "Distributions" entry: unlike a remote (technically reusable across
repositories), a distribution exists to publish exactly one repository, so it's managed from a
"Distributions" tab on that repository's own detail page (`RepositoryDistributionsTab`) rather
than a separate global list requiring a repository picker.

A repository's detail page has one tab per concern: Overview, Packages, Advisories, Content
(package groups/categories/environments/langpacks, modulemd, distribution trees, repo metadata
files - one collapsible section per type), Versions, Distributions, Access.

"Remotes" holds both standard RPM remotes and Oracle ULN remotes behind a small "Standard"/"ULN"
toggle, rather than a separate nav item - they're different Pulp objects, but conceptually both
answer "what does Pulpit sync from".

Ansible's "Remotes" page uses the same toggle idea but with **three** flavors (Collection/Git/
Role, `src/features/ansible/remotes/RemotesPage.tsx`) instead of RPM's two, since Ansible has three
genuinely different remote object types (see `docs/PULP_API.md` "Ansible endpoints"). A repository's
detail page has one tab per concern: Overview, Collections, Roles, Versions, Distributions, Access

- no Advisories/Content-tab equivalent (Ansible has no comps/modulemd-style read-only content
  types), but Overview does carry `Sign content…`/`Mark…`/`Unmark…` actions RPM's Overview tab
  doesn't have.
  Unlike RPM, an Ansible distribution needs no publish step at all (`docs/PULP_API.md`) - its
  Distributions tab shows a copyable `ansible.cfg` client-configuration snippet per distribution
  instead of just a bare URL. "Namespaces" is scoped to one distribution at a time (a picker, not a
  global list) since Galaxy namespace profiles live inside a distribution's own Galaxy-compatible
  API, not as a standalone Pulpit resource. "Search" is the one Ansible nav item with no RPM
  equivalent - a cross-repository "find this collection anywhere" tool, since Ansible's Galaxy-v3
  API provides one and RPM's doesn't.

Implemented as PatternFly `Masthead` (product mark + wordmark, Tasks indicator, Help, a small
"Pulp API" link, User menu) + `Sidebar`/`Nav` (the tree above) + `PageSection` content area. No
breadcrumb trail - one was tried (a `PulpIT > <page>` row above every page's content, driven by
`handle: {crumb}` route metadata) but removed per direct user feedback ("partout... retire les");
each page's own `PageHeader` title already says where you are. A nav group auto-expands whenever
the current route lives inside it (`AppNav.tsx` passes `isExpanded` to `NavExpandable`, matching
its existing `isActive`) so reloading a page never collapses its own section back to closed - the
group only ever starts collapsed for routes outside it. Not every leaf is fully built at bootstrap
time (see `docs/ROADMAP.md`), but the route tree supports all of it (see routing in
`docs/DEVELOPMENT.md`).

"Access" (`src/features/access/`) is pulpcore-core, not plugin-specific, so unlike RPM/Ansible/
Containers it has no "Repositories" concept of its own - just Users, Groups (each with Members and
Roles tabs), and Roles (an All/Built-in/Custom filter defaulting to All, since ~180 roles ship
with Pulp itself and can't be edited). Assigning a role to a user or group can be scoped to one specific object by pasting its
href (`AssignRoleModal.tsx`) - the friendlier way to do the same thing is the **Access** tab this
milestone added to every Repository detail page across RPM, Ansible, and Containers
(`ObjectAccessTab.tsx`, one shared component, not three copies): grant a role to a user/group
scoped to that repository without needing to know its href at all. See `docs/PULP_API.md` "Access
endpoints" for the live-verified API behavior behind both.

**No nav-toggle button** (`AppLayout.tsx`) - by design, the sidebar is always shown rather than
manually collapsible; the product mark sits at the masthead's leading edge, where the toggle used
to be, instead of next to it. The wordmark next to it ("PulpIT") is a plain `<a>` via
`MastheadLogo`, which would otherwise pick up PatternFly's global anchor default (a dashed
underline, `base.css`'s `--pf-t--global--text-decoration--link--*` tokens) - overridden with
`textDecoration: "none"` on the link plus a dedicated `.pulpit-brand-text` class (`global.css`,
PatternFly's own heading font/weight tokens, no new font asset) so it reads as a logotype rather
than another link.

## Authentication

A standalone `/login` route (`PatternFly LoginPage` + `LoginForm`, no masthead/nav - it's outside
the authenticated shell) is the only way into the app; every other route redirects here if there's
no active Pulp session, preserving the originally-requested path via `?next=` so login returns you
where you were headed. This is a real form (username/password fields, inline validation, an error
message on bad credentials) - not a browser-native Basic-auth prompt; see `docs/AUTHENTICATION.md`
for the mechanics.

Once authenticated, the masthead's right side shows a user menu (`src/app/layout/UserMenu.tsx`) -
a `MenuToggle` with a person icon and the current username, opening a `Dropdown` with "Log out" -
rather than plain inline text, so it reads as a real control instead of a status line. This is
the only Access/identity surface in the masthead itself (see `docs/RBAC.md` for the separate
Users/Groups/Roles management pages under **Access**). `.pf-v6-c-masthead__content` (Tasks, Help,
theme toggle, user menu) is a flex row with no `justify-content` set by PatternFly itself, which
left it start-aligned inside the space the masthead grid already reserves for it - a `pulpit-masthead-actions`
class (`global.css`) adds `justify-content: flex-end` to actually push it to the far edge.

## Page anatomy

- `PageSection` with a page header (title, primary action button, e.g. "Create repository") above
  the content.
- List pages: toolbar (search/filter) + table + pagination, not a grid of cards.
- Detail pages: tabs (e.g. Overview | Packages | Versions | Distribution | Permissions for an RPM
  repository), not one long scroll.
- Cards are used sparingly — e.g. the small `Gallery` of compact stat tiles on Overview
  (`src/components/PulpStatusSummary.tsx`: Database, Redis, workers, storage...) — not as
  the default container for every piece of content. Longer lists (e.g. the component/version
  table on that same page) use a compact `Table`, not a card per row.
- The component/version table on Overview gains a fourth "Repositories" column
  (`PulpStatusSummary`'s optional `repositoryCounts` prop, populated by `OverviewPage.tsx` via
  `src/features/overview/useRepositoryCounts.ts` - `PulpStatusSummary` itself stays generic and
  simply omits the column whenever a caller doesn't pass the prop). Each cell is either a link to
  that plugin's own Repositories page showing its count (RPM/Ansible/Container, gated on
  `deriveCapabilities`; a count-only request, `limit: 1`, only `.count` from the response
  envelope is read), or a plain "—" for every component Pulpit has no Repositories page for (deb,
  gem, core itself, ...). Originally tried as a separate stat-tile `Gallery` below the table, then
  moved inline into the existing table per direct user feedback ("je les voulais inline dans le
  tableau des modules"). Size totals are calculated in the browser from Pulp's paginated content and
  artifact APIs using the caller's credentials. Repository totals cover their latest
  version. TanStack Query caches the derived values for five minutes; the backend
  does not persist aggregates. Loading uses the existing skeleton and unavailable
  data renders a dash. Large instances may take longer to finish the scan.

## Table conventions

- Sortable columns where the API supports server-side ordering; otherwise client-side within the
  current page only (never silently sort only the current page and imply it's global).
- Server-side pagination reflecting Pulp's actual `count`, matching `docs/PULP_API.md`.
- Row actions via a kebab/dropdown menu; destructive actions require confirmation (see below).
- Status conveyed with PatternFly `Label`/icon + text, never color alone.

## Forms

- PatternFly `Form`/`FormGroup` with explicit `<label>`s (accessibility requirement, not
  optional).
- Validation errors shown inline, mapped from Pulp's `400` field-level error payload
  (`docs/PULP_API.md`) — not a generic "something went wrong."
- Submit buttons disabled while a mutation is in flight; no double-submit.

## Destructive actions

Any delete/irreversible action requires an explicit confirmation modal naming the specific
object being affected (not a generic "are you sure?"). No destructive action fires from a single
click with no confirmation step.

**When a delete has a surprising secondary consequence, say so explicitly.** `ConfirmDeleteModal`
(`src/components/ConfirmDeleteModal.tsx`) takes an optional `warning` prop for exactly this - a
prominent inline `Alert` above the normal confirmation text. Added for container distributions,
where deleting one also deletes its repository (VERIFIED live, see `docs/PULP_API.md` "Container
endpoints") - a consequence well beyond "this item is gone" that the generic confirmation wording
alone wouldn't convey. Use it whenever a delete cascades somewhere a user wouldn't reasonably
expect, not for the ordinary "this item and its own content is gone" case every delete already
implies.

## Task feedback

See `docs/ARCHITECTURE.md` "Tasks" and the `pulp-tasks` skill. Masthead shows a "Tasks (n)"
indicator for in-flight tasks; a drawer lists recent tasks with real state
(waiting/running/completed/failed/canceled) and, for failures, a way to view Pulp's actual error
detail. No fabricated progress bars where Pulp doesn't report progress.

## In-app help panel

The masthead's "Help" button (`src/app/layout/HelpButton.tsx`) toggles a **help panel**
(`src/app/layout/HelpPanel.tsx`) open/closed — clicking it again while open closes it, the same
toggle behavior as the Tasks indicator — rather than linking out to Pulp's own Swagger/ReDoc docs.

**Help and Tasks share `Page`'s one `notificationDrawer` slot** (`AppLayout.tsx`), rather than each
having its own independent `Drawer`: `notificationDrawer` renders `<HelpPanel>` when Help is open,
`<TasksDrawer>` otherwise, and `isNotificationDrawerExpanded` is `isDrawerOpen || isHelpOpen`.
`TasksIndicator` takes an `onToggle` prop (`AppLayout.tsx` passes `() => setIsHelpOpen(false)`) and
the Help button's own `onClick` closes the Tasks drawer before toggling Help, so opening either one
always closes the other — they're mutually exclusive, not two independently stacked panels. This
was a deliberate fix: an earlier version gave Help its own separate, nested `Drawer`, which made it
render one level deeper than Tasks (different vertical alignment, and it visually hid behind the
Tasks panel when both were opened) instead of at the same level. Sharing one slot also means Help
automatically gets the exact same fixed, non-resizable panel size as `TasksDrawer` (neither passes
any `DrawerPanelContent` size props - no `widths`, `isResizable`, `defaultSize`/`minSize`/`maxSize`

- so both fall back to the same built-in PatternFly default), with no size props to keep in sync
  between them, except while Help is open: `AppLayout.tsx` widens the shared slot specifically for
  Help (`drawerDefaultSize="44rem"`, vs. PatternFly's plain default for `TasksDrawer`) since Help's
  two-level content needs more room to stay readable than the Tasks list does — this is the one size
  prop that does differ between them, deliberately, not an oversight. A small "Pulp API" link
  (`src/app/layout/PulpApiDocsLink.tsx`, `ExternalLinkAltIcon`, opens in a new tab) sits immediately
  to the right of Help, so Pulp's own generated API reference is still one click away — it's just no
  longer the primary destination.

**Two levels, mirroring the real app navigation, not one flat block per category.** The panel's
left side (`Nav`) lists the same top-level categories as `src/app/layout/navTree.ts` (Overview,
RPM, Containers, Ansible, Tasks, Access, Administration). A category with real sub-pages
(everything except Overview/Tasks) renders as a `NavExpandable` — the same "stays expanded around
whatever's currently selected" component `AppNav.tsx` itself uses for the real sidebar — whose
children are that category's own **Overview** entry (always first: "what is this section for," a
short landing paragraph or two) followed by one entry per real sub-page (e.g. RPM's Repositories/
Packages/Advisories/Remotes/Alternate sources), each with a full, detailed, simple explanation of
that one page. A flat category (Overview, Tasks) has only that one entry and renders it directly,
with no expandable group at all — the same shape every category used to have. This structure lives
in `src/features/help/topics/index.ts`'s `HELP_CATEGORIES` array; each page is a small
hand-authored TSX component under `src/features/help/topics/<category>/` using PatternFly's
`Content` component for typography — no markdown-rendering dependency was added (there wasn't one
in the project already, and this content set doesn't justify one).

**Opens on the most specific page for the current route, not just its category.**
`getHelpLocationForPath` (`src/features/help/topics/index.ts`) maps the current route to a
`{categoryId, pageId}` pair by matching the longest page `path` prefix under the matching
category's `pathPrefix` (e.g. `/rpm/repositories/some-name` → RPM's own Repositories page, not just
the RPM category's overview; a bare `/rpm` falls back to RPM's Overview page; note Administration's
own routes live under `/admin`, not `/administration` — see `navTree.ts`). `HelpPanel` reads this
via `useLocation()` at mount time to pick its initial category/page, rather than always defaulting
to Overview. This works because the panel unmounts while closed (the same "only renders while
expanded" `DrawerPanelContent` behavior noted elsewhere in this doc for Tasks/`TaskTrackers`), so
every time it's opened it's a fresh mount that re-reads the current route. Once open, picking a
different category/page from the list is a normal, un-synced local selection — navigating to a
different page while the panel stays open does not retroactively jump topics. Clicking a collapsed
category's own title both expands it and jumps straight to its Overview page (`onExpand` on
`NavExpandable`) — one click to "what is this section for," matching the old flat list's behavior
for that specific case.

**Write page content as user-facing task documentation, not implementation notes.** Category
Overview entries stay short (a paragraph or two, orientation only); each sub-page's own entry does
the real work — explain how to accomplish something on that one page (concrete steps: "click Create
repository, enter a name, pick a remote...") and every real feature/action/field on it, including
the real gotchas a user would hit (e.g. advisory upload wanting JSON not `updateinfo.xml`, or a
distribution needing a publication before its URL works) — not commentary about Pulpit's own
development state or how complete an area is relative to others. That framing belongs in
`docs/ROADMAP.md` for the project's own contributors, not in help content aimed at someone trying
to get their RPM content synced. An unbuilt feature's page should say plainly that it isn't
available yet, without editorializing about project priorities, and should never omit a real,
shipped feature just because the doc predates it.

**This is a required, ongoing system, not a one-off page**: a change that adds or materially
changes a user-facing feature must update the corresponding Help topic in the same change, the
same way it must update docs/ADRs.

## Notifications

- Transient toast/alert for "action succeeded" (e.g. "Repository created") and for errors that
  aren't better shown inline on a form.
- Task failures surface both as a toast (if the user is still on a related page) and persist in
  the task drawer/history so they aren't missed if the user navigated away.

## Loading / empty / error states

Every data-driven view has three explicit states, using shared components
(`src/components/LoadingState`, `EmptyState`, `ErrorState`):

- **Loading**: skeleton or spinner appropriate to the content shape — not a full-page blank.
- **Empty**: PatternFly empty state explaining what's missing and, where applicable, a primary
  action (e.g. "No repositories yet — Create repository").
- **Error**: normalized message per `docs/PULP_API.md`'s error model, with a technical-details
  expansion, and a retry action where retrying makes sense.

## Accessibility

Semantic headings, full keyboard operability, visible focus, labeled controls, accessible
dialogs/tables, status never conveyed by color alone. PatternFly provides most of this by
default — don't override it with custom markup that breaks it (ADR 0002).

**Unlike `Modal`, PatternFly's `Drawer`/`NotificationDrawer` don't close on Escape or return focus
to their trigger for free** — a whole-app accessibility audit (see docs/ROADMAP.md's "Cross-cutting:
Accessibility audit") found the Tasks/Help notification drawer (`AppLayout.tsx`) missing both.
`AppShell` now wires this up itself: a document-level Escape handler while either panel is open,
and an effect that remembers `document.activeElement` right before opening and restores it on
close (covering the drawer header's own Close button too, not just Escape). Any _new_ `Drawer`-based
panel this app adds should follow the same pattern rather than assuming PatternFly handles it —
verify against a real Tab/Escape session, the same way this gap was found (automated `axe` scanning
alone did not catch it; see `e2e/a11y.spec.ts`'s "keyboard operability" suite).

**Every panel/dialog title should be a real heading (`Title`/`h1`-`h6`), never a styled `<span>`** —
screen-reader users commonly navigate by jumping between headings, and a styled-but-non-semantic
title is invisible to that navigation. Caught the same way: `HelpPanel`'s title was a plain
`<span className="pf-v6-c-title pf-m-lg">`, inconsistent with `TasksDrawer`'s real `<h1>` from
`NotificationDrawerHeader`'s `title` prop — fixed to `<Title headingLevel="h1" size="lg">`.

`e2e/a11y.spec.ts` runs `@axe-core/playwright` (WCAG 2.1 A/AA) across a representative sample of
routes - every content-type plugin's Repositories page, Tasks, and every `/admin` tab/sub-tab
(including the merged Access sub-tabs, docs/adr/0010-merged-administration-page.md) - plus the
login page, one representative page in dark theme, and a couple of key dialogs/panels, plus a
handful of manual keyboard/focus-management checks automated scanning can't do on its own. It does
not scan every single route (e.g. per-plugin Remotes/Content/detail pages aren't each scanned
separately - the same PatternFly components repeat across those). Static JSX accessibility linting
(`eslint-plugin-jsx-a11y`, already wired into `eslint.config.js`) is the first line of defense; this
suite is the second, catching things only visible in the rendered, computed DOM.

## Responsive behavior

Desktop administration is the primary use case. The shell collapses to a reasonable
narrower-viewport layout (PatternFly's built-in responsive nav/table behavior), but no dedicated
mobile-first design work is planned for the admin views themselves.

## Terminology

Use Pulp's own terminology (repository, repository version, remote, distribution, publication,
content, task, sync) rather than inventing friendlier-but-different frontend terms — consistent
with the project's principle of preserving Pulp's own semantics rather than inventing frontend
ones.

## Product mark

PulpIT's mark is the `cil-layers` icon from [CoreUI Icons](https://github.com/coreui/coreui-icons)
(three stacked layers — read as "layered content/repositories," which maps onto Pulp's own
repository _version_ model) on a rounded brand-blue badge, white icon on `#0066cc`. It's a single
static SVG file, `public/pulpit-mark.svg`, used unmodified in three places: the masthead
(`MastheadLogo`, `src/app/layout/AppLayout.tsx`), the login page brand slot
(`brandImgSrc`, `src/features/auth/LoginPage.tsx`), and the browser favicon (`index.html`). The
icon artwork is CC BY 4.0 — see `README.md` "Credits" for the attribution this requires; the
badge/color composition around it is original. No Red Hat marks, no Pulp trademarks used in a way
that implies affiliation.

## Theming

PatternFly v6 ships a dark theme as a single CSS class, `pf-v6-theme-dark`, applied to `<html>` —
there's no built-in toggle component or automatic `prefers-color-scheme` wiring (verified against
the PatternFly dark-theme handbook), so Pulpit provides its own:

- `src/app/theme/ThemeContext.tsx` (`ThemeProvider`/`useTheme`) resolves the initial theme from
  `localStorage["pulpit:theme"]`, defaulting to **light** if nothing is stored yet, and
  applies/removes the class on `document.documentElement`. Light-by-default is a deliberate Pulpit
  product decision, not PatternFly's own recommendation (PatternFly's dark-theme handbook suggests
  following the OS `prefers-color-scheme` instead) — once a user picks a theme via the toggle,
  that choice is what's remembered, not the OS setting. This is a UI preference like table filters
  or pagination (`docs/ARCHITECTURE.md` "ephemeral frontend state"), not a credential — persisting
  it in `localStorage` is fine (contrast with `docs/SECURITY.md`'s rule against credentials there).
- `ThemeProvider` wraps the whole app (`src/app/App.tsx`), above the router, so both the
  authenticated shell and the standalone `/login` route share one theme.
- A masthead `ThemeToggle` button (sun/moon icon, `@patternfly/react-icons`) lets the user flip it.
- The login page's background is a plain CSS `radial-gradient` glow (brand-color, via
  `color-mix()`), scoped to `.pulpit-login-page` in `src/styles/global.css` — **not**
  PatternFly's bundled `PF-Bkg-Generic-*.svg` login art. That asset has an opaque rect _and_ a
  gaussian-blurred shape baked into the SVG itself; at the small size a login page clamps it to,
  both produced visible artifacts (a hard-edged box where the rect's fill didn't match the real
  page background, and color banding in the blur) that a `mask-image` fade couldn't fully hide
  (the mask's own radius was easy to get wrong relative to the tiny clamped image, which is what
  happened the first time this was tried). A CSS gradient we fully control has neither problem and
  needs no theme-swapping logic. This is a small, targeted exception to "no custom CSS" (ADR 0002)
  — layout glue, not a component reimplementation.
- The authenticated shell does **not** carry this glow — it was tried there too (a
  `pulpit-app-shell` class, same rule family) but read as visual noise behind dense working
  screens, unlike the login page's one-time decorative moment. Removed per direct user feedback;
  kept scoped to `.pulpit-login-page` only.
- Don't introduce other custom dark-mode CSS overrides — PatternFly's design tokens
  (`--pf-t--...`) already repaint correctly when the class is toggled (ADR 0002: don't reimplement
  what PatternFly already does).
