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
    Users, Groups, Roles, LDAP

Administration
    Repository Signing (General, Pulp Signing Services), Content guards, Default Settings
```

"Repository Signing" (pulpit-core, ADR 0006/`docs/signing.md`) manages the GPG key used to sign
RPM packages/metadata and its automatic rotation. Its own "Pulp Signing Services" sub-tab is the
pre-existing, read-only view of whatever `core.SigningService` objects exist on the Pulp server
(any content type, not just RPM) - nested under Repository Signing rather than a separate
top-level tab, since it isn't an unrelated concern: it's the underlying Pulp objects Repository
Signing's own key-generation settings (`rpm_signing_service_name`/`metadata_signing_service_name`)
reference by name, and a generated key's Pulp-side publish status depends on them.

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

Implemented as PatternFly `Masthead` (static product mark + wordmark, Tasks indicator, Helper,
theme toggle, User menu) + `Sidebar`/`Nav` (the tree above) + `PageSection` content area. No
breadcrumb trail - one was tried (a `PulpIT > <page>` row above every page's content, driven by
`handle: {crumb}` route metadata) but removed per direct user feedback ("partout... retire les");
each page's own `PageHeader` title already says where you are. `PageHeader` likewise renders no
generic subtitle/tagline: sentences that merely restate the current section add noise without
helping the user complete a task. Action-specific guidance, empty-state explanations, warnings,
and resource data remain visible where they are useful. A nav group auto-expands whenever
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

The masthead actions are presented as four distinct, evenly spaced controls rather than loose
text: each has a subtle brand-tinted surface, border, shared radius, and visible hover/focus
treatment. This keeps Tasks, Helper, the theme switch, and the user menu recognizable as
interactive targets without giving them the visual weight of primary page actions.

**The product mark is static product identity** (`AppLayout.tsx`), not a navigation control.
The sidebar stays open and the mark has no click, hover, focus, or collapse behavior.
`.pulpit-brand-text` uses PatternFly's heading family and weight only; it inherits the masthead
foreground instead of adding a brand color.

## Authentication

A standalone `/login` route (`PatternFly LoginPage` + `LoginForm`, no masthead/nav - it's outside
the authenticated shell) is the only way into the app; every other route redirects here if there's
no active Pulp session, preserving the originally-requested path via `?next=` so login returns you
where you were headed. This is a real form (username/password fields, inline validation, an error
message on bad credentials) - not a browser-native Basic-auth prompt; see `docs/AUTHENTICATION.md`
for the mechanics.

Once authenticated, the masthead's right side shows a user menu (`src/app/layout/UserMenu.tsx`) -
a text-only `MenuToggle` with the current username, opening a `Dropdown` with "Log out" -
rather than plain inline text, so it reads as a real control instead of a status line. This is
the only Access/identity surface in the masthead itself (see `docs/RBAC.md` for the separate
Users/Groups/Roles management pages under **Access**). `.pf-v6-c-masthead__content` (Tasks, Help,
theme toggle, user menu) is a flex row with no `justify-content` set by PatternFly itself, which
left it start-aligned inside the space the masthead grid already reserves for it - a `pulpit-masthead-actions`
class (`global.css`) adds `justify-content: flex-end` to actually push it to the far edge.

## Page anatomy

- `PageSection` with a page header (title, primary action button, e.g. "Create repository") above
  the content.
- The application canvas remains visible around the page's primary functional surface. Every
  non-dashboard page places its list, settings form, or tab set in one inset PatternFly surface
  using the same border, radius, and restrained shadow as Overview's dashboard panels. Toolbars
  and tables share that surface rather than appearing as separate edge-to-edge white bands.
  Detail and Administration tabs form the surface header and their content remains inside it.
  This is one panel per functional block, never a card per table row or form field.
- List pages: toolbar (search/filter) + table + pagination, not a grid of cards.
- Initial table loads use the shared `LoadingState` with the table's column names:
  real headings and five neutral PatternFly skeleton rows, an accessible loading
  announcement, and `aria-busy`. Placeholders offer no actions or fake results.
  Details/forms keep their compact spinner. Errors replace the loading state.
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

- A toolbar immediately followed by its table does not stack the generic
  `PageSection` row gap on top of the toolbar's own spacing. Pagination-only
  toolbars also drop their surrounding vertical padding; toolbars with
  actions or filters retain it so their controls stay clearly separated from
  tabs and table headers.
- Sortable columns where the API supports server-side ordering; otherwise client-side within the
  current page only (never silently sort only the current page and imply it's global).
- Server-side pagination reflecting Pulp's actual `count`, matching `docs/PULP_API.md`.
- Paginated tables derive their initial page size from the viewport height so the table fills the
  useful space without routinely forcing a page-level vertical scrollbar. Resizing continues to
  adjust that automatic value and returns to page one; once a user explicitly selects a page size,
  that choice remains fixed for the lifetime of the view. The active automatic value is included
  alongside the standard PatternFly choices in the page-size menu.
- Tables with enough columns to overflow a tablet viewport use PatternFly's responsive grid at
  the `grid-lg` breakpoint and provide `dataLabel` on every data cell. The stacked layout keeps
  values and row actions visible without relying on users discovering a hidden horizontal scroll.
- Long technical identifiers and URLs use PatternFly's compact clipboard-copy treatment with
  middle truncation. The complete value remains available in a tooltip and can be copied without
  selecting wrapped table text.
- Row actions via a kebab/dropdown menu; destructive actions require confirmation (see below).
- Status is rendered through the shared `StatusIndicator` as a compact, rounded PatternFly label.
  Its text always carries the complete meaning; color reinforces success, failure, warning, or an
  in-progress state but is never the only signal. Category values and tags remain plain text or
  dedicated table columns.

## Forms

- PatternFly `Form`/`FormGroup` with explicit `<label>`s (accessibility requirement, not
  optional).
- Related choice controls are grouped with PatternFly layout spacing: radio options with
  descriptions use `Stack hasGutter`; dense scrollable checkbox lists use a vertical `Flex` with
  `spaceItemsSm`. Never place repeated choices directly next to one another without a layout gap,
  because their labels/descriptions visually merge into one block.
- Simple single-column settings forms use the shared `pulpit-readable-form` width so fields and
  helper text remain easy to scan on wide displays. Large technical values may use the full width
  when their content genuinely benefits from it.
- Longer settings pages group fields by task before placing them in a responsive PatternFly grid:
  three columns for short, independent groups on wide desktops, two columns at intermediate
  widths, and one column on narrow screens. Column spans are chosen per group (for example,
  directory connection/bind/search groups or signing cards), not applied mechanically to every
  field; long technical values and tables keep the width they need.
- Multi-line client configuration is previewed in a PatternFly code block with copy and explicit
  show-more/show-less controls instead of expanding every table row by default.
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

Task detail modals put a compact state/duration/author/timing summary first,
followed by human-readable failures and live progress. Resources, raw resource
records, task function, creation time, href, and correlation ID belong in a
single **Technical details** disclosure, collapsed by default. Finished time
appears only when Pulp reports it. The summary uses two columns on desktop and
one on narrow screens; long diagnostics wrap rather than overflow.

Failed task details show a plain-language explanation and the next checks to
perform, including failures that Pulp reports through `reason` rather than
`description`. Keep the original error and traceback behind **Technical error
details**. Do not infer an OOM kill from signal 9 alone. For failed syncs,
explain that downloaded files do not imply a completed repository version.

See `docs/ARCHITECTURE.md` "Tasks" and the `pulp-tasks` skill. Masthead shows a plain-text
"Tasks · n active" indicator for in-flight tasks, separated typographically instead of using a
badge; a drawer lists recent tasks with real state
(waiting/running/completed/failed/canceled) and, for failures, a way to view Pulp's actual error
detail. No fabricated progress bars where Pulp doesn't report progress.

Actions on an existing resource remain locked for the full lifetime of the backend task, not
only while the initial HTTP request is pending. The action that launched the task shows an
indeterminate spinner; other actions for the same resource are disabled until Pulp reports a
terminal state. This task/resource lock is app-wide, so navigating between a list and a detail
page must not make the action available again while it is still queued or running.

## In-app help panel

The masthead's "Help" button (`src/app/layout/HelpButton.tsx`) toggles a **help panel**
(`src/app/layout/HelpPanel.tsx`) open/closed — clicking it again while open closes it, the same
toggle behavior as the Tasks indicator — rather than linking out to Pulp's own Swagger/ReDoc docs.

**Helper and Tasks share `Page`'s one `notificationDrawer` slot** (`AppLayout.tsx`), rather than each
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
  prop that does differ between them, deliberately, not an oversight. The masthead control is
  labeled "Helper" while the panel heading remains the concise noun "Help".

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

## Product mark and iconography

PulpIT's product mark uses Lucide's generic `package-open` pictogram inside a rounded blue tile.
It represents the import, management, and distribution of packages without borrowing another
product's brand mark. The full mark lives in `public/pulpit-mark.svg`; a small-size treatment lives
in `public/favicon.svg`. The masthead and login page use the full mark, while `index.html` uses the
favicon. The copied SVG path is licensed under ISC; the required notice is preserved in
`THIRD_PARTY_NOTICES.md`.

Recognizable technology and plugin brands use the official paths and colors from the `simple-icons`
package. Generic interface actions and concepts (navigation, help, theme, tasks, storage, status)
use PulpIT's small internal line-icon set in `src/components/icons/UiIcon.tsx`; brand marks are not
repurposed as action glyphs. Both sets render through shared components so sizing, accessible names,
and decorative treatment stay consistent. Simple Icons data is CC0 1.0; represented trademarks
remain the property of their owners. No Red Hat marks or Pulp trademarks are used in a way that
implies affiliation.

## Theming

PulpIT's primary brand color is azure blue (`#2563eb` in the light theme, with a lighter
`#60a5fa` dark-theme counterpart). PatternFly's semantic brand tokens are mapped to this palette,
so links, primary actions, focus treatments, active navigation, progress indicators, and product
identity stay consistent. Orange remains reserved for warnings and the coral environment marker,
preventing brand actions from being confused with operational status.

Light and dark themes share exactly the same shell geometry: sidebar width, masthead padding,
main-container edge treatment, page-section spacing, cards, and tables do not move when the theme
changes. Only semantic surface, border, text, and interaction colors vary. Theme-specific
PatternFly defaults must not reintroduce an inset outer card or different page margins.

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
- A masthead `ThemeToggle` button (sun/moon icon from PulpIT's internal UI set) lets the user flip it.
- `src/styles/global.css` strengthens PatternFly's semantic subtle-text and border tokens in both
  themes and raises the body weight slightly. This is deliberate resilience for compressed remote
  application gateways: labels, table rules, and secondary text stay legible without changing
  component structure or hardcoding per-component colors.
- The authenticated light-theme shell uses PatternFly component variables to make its layers
  unambiguous: a white masthead, a stronger neutral navigation rail, and a white working surface
  with a visible border, restrained shadow, and smaller radius. The current navigation item uses
  the semantic brand-subtle surface, so selection remains identifiable by both its blue accent and
  its background. These overrides are deliberately excluded from dark mode, whose hierarchy stays
  owned by PatternFly.
- The login page uses the same neutral canvas, opaque panel surface, border, radius, and
  restrained shadow as the dashboard. PatternFly's composable Login components keep the
  product mark and name inside the card, above the centered, single-column form at every
  viewport width. Shared release/changelog/license links sit in a separated band inside the
  bottom of the card, in normal document flow so they remain reachable on short screens and
  at increased zoom. Both themes use the existing
  semantic and dashboard surface tokens; the former decorative login glow is removed.
- Don't introduce other custom dark-mode CSS overrides — PatternFly's design tokens
  (`--pf-t--...`) already repaint correctly when the class is toggled (ADR 0002: don't reimplement
  what PatternFly already does).
