# Roadmap

Status legend: `[x]` implemented, `[~]` partially implemented / stubbed, `[ ]` not started.

## Milestone 0 — Foundation

- [x] Repository bootstrap (docs, ADRs, contributor guide)
- [x] PatternFly application shell (masthead, nav, routing)
- [x] Real Pulp API health integration (Overview / System Status)
- [x] Docker/Compose dev environment (Pulpit + Pulp, same-origin nginx)
- [x] Testing setup (Vitest, RTL, Playwright) with a first real test per layer
- [x] Contributor/agent tooling setup (contributor guide, dev skills, MCP docs)

## Milestone 1 — Core

- [x] System status page (real data, capability detection)
- [x] Task management: `TasksContext`/`registerTask`/`useTrackedTask` + masthead drawer, exercised
      end-to-end against real mutating RPM actions (sync, delete, async create, upload) - see
      Milestone 2. Fixed a real bug found along the way: PatternFly's `Drawer` only mounts its
      panel content once expanded at least once, so task polling/invalidation used to silently
      never start until a user opened the Tasks drawer; a headless `TaskTrackers` component
      (`src/features/tasks/TaskTrackers.tsx`), mounted unconditionally alongside the drawer, now
      drives it regardless.
- [x] Common API infrastructure (client, errors, generated-types pipeline)
- [x] Normalized error handling (unauthenticated/forbidden/not-found/validation/conflict/backend
      unavailable/task failure/network failure)
- [x] Login UI: `/login` route, session-cookie auth against Pulp's own `/login/` endpoint, route
      guard (`RequireAuth`) redirecting unauthenticated visitors, masthead user menu (username +
      logout dropdown) (`docs/AUTHENTICATION.md`)

## Milestone 2 — RPM

- [x] Repositories (list/detail/create/edit/delete) - name-based routing
      (`/rpm/repositories/:name`), since Pulp hrefs are opaque and only known once an object is
      already fetched. Edit (name/description/default remote/autopublish) is VERIFIED
      asynchronous (PATCH, 202 + task) even though create is synchronous (POST, 201) - never
      assume PATCH follows POST's sync/async behavior. Renaming navigates to the new URL once the
      task completes.
- [x] Packages (global list + per-repository, filtered by `repository_version`)
- [x] Remotes (list/create/edit/delete) - Create/Edit expose an "Advanced connection settings"
      section (proxy URL/username/password, origin username/password, TLS validation - standard
      pulpcore Remote fields). VERIFIED live: `proxy_username`/`proxy_password`/origin
      `username`/`password` are write-only (GET reports only whether one `is_set`, via
      `hidden_fields`, never the value) and remote update is asynchronous (PATCH, 202 + task).
      VERIFIED that a container-level `HTTP_PROXY`/`HTTPS_PROXY` env var does **not** affect sync
      traffic at all (tested against a real proxy - no requests reached it), while the per-remote
      `proxy_url` field does (confirmed a real sync's traffic reached the test proxy) - see
      `docs/DEPLOYMENT.md` "Outbound HTTP proxy for syncing".
- [x] Alternate Content Sources (`/rpm/alternate-sources`) - local mirror-first sources Pulp checks
      before reaching a remote's real upstream (list/create/refresh/delete). VERIFIED live: only
      remotes with `policy: "on_demand"` are valid (a synchronous `400` otherwise) and refresh
      returns `{task_group}`, not `{task}` - resolved to the group's first task and tracked
      normally (see `getTaskGroup` in `src/api/client/tasks.ts`).
- [x] ULN remotes (list/create/edit/delete; a second remote "flavor", toggled within the Remotes page, not a separate nav
      item) - VERIFIED live: same shape as a standard remote plus `uln_server_base_url`, but
      `username`/`password` are _required_ (unlike a standard remote, where they're optional
      advanced fields) - modeled as a fully separate create modal rather than forcing it into the
      standard one. Edit preserves the write-only credentials when their fields are left blank;
      VERIFIED live that PATCH returns `202` + task.
- [x] Sync (VERIFIED live against `fixtures.pulpproject.org/rpm-unsigned/`: repository/remote
      create is synchronous/201; sync/delete/distribution-create are asynchronous/202+task)
- [x] Distributions (list/create/delete) - managed from a "Distributions" tab on the owning
      repository's detail page, not a separate top-level page (a distribution always publishes
      exactly one repository, so there's no repository picker - see `docs/UX.md` "Navigation").
      A distribution pointing at a `repository` only ever serves a _publication_ of it, never
      repository content directly (VERIFIED live: a distribution 404'd on `repodata/repomd.xml`
      until its repository was published). Fixed with an `autopublish` checkbox on repository
      create (on by default) and a manual "Publish now" action on the repository Overview tab
      (`src/api/client/rpm/publications.ts`) for repos created before this or with autopublish
      off. Publications aren't independently listed/managed as their own object in the UI - only
      triggerable per-repository.
- [x] Repository version history (versions tab, current-version indicator, content summary)
- [x] Package upload (VERIFIED two-step flow: upload creates the content unit, a separate
      `modify` call adds it to a repository - the upload endpoint has no `repository` field
      despite its `overwrite` field's description text)
- [x] Advisories/errata (`/rpm/advisories` global list + a repository "Advisories" tab, upload).
      VERIFIED live (a real surprise): the upload endpoint's `file` is **not** a real-world
      `updateinfo.xml` - pulp_rpm parses it as JSON matching `RpmAdvisory`'s writable fields, so a
      raw updateinfo.xml upload fails with a JSON decode error. Unlike package upload, the
      `repository` field IS accepted directly (one step, confirmed live via the real UI, not just
      curl) - see `src/api/client/rpm/advisories.ts`. Syncing a repository whose remote already
      has advisories remains the practical way most of them get into Pulp.
- [x] Consolidated repository "Content" tab for the remaining sync-derived, read-only content
      types: package groups/categories/environments/langpacks (comps.xml-derived), modulemd/
      modulemd defaults/modulemd obsoletes, distribution trees, repo metadata files - one
      collapsible section per type (empty types stay visible, collapsed, rather than
      disappearing). All VERIFIED against real synced data from
      `fixtures.pulpproject.org/rpm-unsigned/` except modulemd*/distribution trees/repo metadata
      files, which this dev instance has no synced sample of (shaped from the live schema only).
- [x] Bulk comps.xml upload (`rpm/comps/`, from the Content tab's toolbar) - creates package
      groups/categories/environments/langpacks together; VERIFIED live with the real fixture
      repo's own comps.xml (via the actual UI, not just curl).
- [x] Prune packages (`rpm/prune/`, a "Prune packages…" action on the repositories list) - removes
      superseded package versions across selected repositories; dry run defaults on. VERIFIED
      live: like ACS refresh, returns `{task_group}`, not `{task}`.
- [x] Copy repository-version content to another repository (`rpm/copy/`, a "Copy to…" action on
      the current version in the Versions tab). VERIFIED live: unlike ACS refresh/prune, returns a
      plain `{task}`. Simplified: always copies the whole source version - the real `config`
      payload supports per-content-type criteria, not built here.
- [ ] Repository/package signing info (where supported by the target Pulp version) - deferred to
      Milestone 6 (Signing services UI), out of this milestone's scope

Tests: unit tests for every RPM API adapter (`src/api/client/rpm/*.test.ts`, MSW-mocked), component
tests for every RPM page/tab/modal including a headless-vs-drawer task-tracking regression test
(`src/features/tasks/TaskTrackers.test.tsx`), and end-to-end Playwright specs (`e2e/rpm.spec.ts`)
exercising the full remote → repository → sync → packages → versions → upload → distribution →
cleanup lifecycle against the real Compose stack. Every live-only finding above (write-only remote
fields, task_group vs. task response shapes, the advisory JSON-not-XML upload format, the ACS
on_demand-policy requirement, the proxy env var non-behavior) was independently confirmed against
the real dev Pulp instance before being relied on in code, not assumed from the schema alone.

## Milestone 3 — Containers

VERIFIED against a live pulpcore 3.116.0 / pulp_container 2.29.0 instance (schema fetched from
`/pulp/api/v3/docs/api.json?component=container`, and the full flow exercised for real: a remote
pointed at `ghcr.io/pulp/hello-world`, synced, browsed, distributed, and pulled with a real
`podman pull` that produced the exact expected image digest).

- [x] **Prerequisite resolved**: rather than generating and securely mounting a real
      `TOKEN_SERVER` signing keypair (security-sensitive Pulp-side configuration beyond this
      bootstrap's scope), `compose.yml` sets `PULP_TOKEN_AUTH_DISABLED: "true"` - a first-class,
      officially supported pulp_container setting for exactly this case (used throughout its own
      functional test suite). See `docs/DEPLOYMENT.md` "Container registry authentication" for
      the full rationale and its explicit **do not use in production** caveat.
- [x] Repositories (list/detail/create/edit/delete) - name-based routing
      (`/containers/repositories/:name`), same rationale as RPM/Ansible. **No publication concept
      at all** (VERIFIED live schema, like Ansible) - a distribution serves the repository/
      repository version directly. A _second_, distinct "push" repository flavor exists
      (auto-created by a real `docker/podman push`) - out of scope for this milestone (see
      docs/PULP_API.md "Container endpoints").
- [x] Remotes (list/create/edit/delete) - the one field genuinely new versus RPM/Ansible is
      `upstream_name` (**required**: the actual image name on the remote registry, e.g.
      `library/busybox`, distinct from Pulpit's own `name` for the remote object). An "Include
      tags" field (comma-separated glob patterns) limits sync to matching tags - not just a
      convenience: VERIFIED live that an unfiltered sync of a real multi-tag image
      (`library/busybox`) failed outright against Docker Hub's anonymous rate limit, while
      `ghcr.io/pulp/hello-world` (a tiny fixture image the pulp_container project itself
      maintains for testing) filtered to its one tag synced cleanly. **VERIFIED live schema
      gotcha**: the request body field `include_tags`/`exclude_tags` is a write-only legacy alias - the real field name, on both read and write, is `includes`/`excludes` (confirmed by
      posting one and seeing the other come back).
- [x] Sync (VERIFIED live against a real registry, not just routing) - repository/remote create
      are synchronous (`201`); sync/delete/distribution-create are asynchronous (`202`+task, same
      shape as Ansible).
- [x] Distributions (list/create/delete) - managed from a "Distributions" tab on the owning
      repository's detail page, matching RPM/Ansible's convention (not the standalone top-level
      page this milestone started as a stub with). The response's `registry_path` field is the
      real `<registry>/<base_path>` pull address - Pulpit builds a copyable
      `podman pull <registry_path>` snippet directly from it (see "Registry UX" below).
      **VERIFIED live, a real and surprising one-directional cascade**: deleting a distribution
      also deletes the repository it points at (confirmed via the delete task's
      `reserved_resources_record` reserving both, and a `404` on the repository afterward) - the
      reverse isn't true (deleting the repository just orphans the distribution,
      `repository: null`). Pulpit's confirm dialog now explicitly warns about this before deleting
      (`ConfirmDeleteModal` gained a new optional `warning` prop for exactly this kind of
      surprising consequence), and the delete mutation also invalidates the repositories list.
- [x] Tags / manifests - repository-scoped **Tags** and **Manifests** tabs, plus a global **Tags**
      page (`/containers/tags`, replacing the "Images" stub nav item) mirroring RPM's global
      Packages page. The Tags tab supports manual **Tag image…** (pick an existing manifest by
      digest, name a new tag) and **Remove** (untag); both asynchronous. **Copying content is
      split into two separate actions** (`copy_tags`/`copy_manifests`), unlike RPM/Ansible's
      single copy endpoint - the "Copy to…" action on the Versions tab fires both and tracks them
      as two tasks, the closest equivalent to a whole-version copy. A `Tag`'s `tagged_manifest`
      field is an href to the manifest, not a digest string - not resolved/joined in the Tags
      table, consistent with RPM/Ansible tables showing only a content unit's own fields.
- [x] Registry UX - the copyable `podman pull <registry_path>` snippet described above, plus the
      real end-to-end `podman pull` verification this milestone's introduction describes. Real
      `docker/podman push` (the "push" repository flavor) is out of scope, per "Repositories"
      above.
- [x] **Infrastructure fixes found during this milestone** (the same class of gap as Milestone 4's
      missing `/pulp_ansible/` route): Pulpit's nginx was missing routes for
      `/pulp/container/...` (pulp_container's own content-serving app, which `/v2/.../blobs/...`
      302-redirects to - without this route, a real `podman pull` silently received Pulpit's own
      `index.html` instead of the real blob, surfacing downstream as a confusing "digest does not
      match" error) and `/extensions/v2/...` (the image-signature extension API podman/docker
      probe on every pull, surfacing as "decoding signature list: invalid character '<'" without
      it). Both fixed in `deployment/docker/nginx/pulpit.conf.template`; full detail in
      `docs/DEPLOYMENT.md`.

Tests: unit tests for every container API adapter (`src/api/client/container/*.test.ts`,
MSW-mocked) plus component tests for every page/tab/modal, and an end-to-end Playwright spec
(`e2e/containers.spec.ts`) exercising the real remote → repository → sync → tags/manifests →
distribution lifecycle (including the registry-cascade-delete warning) against the real Compose
stack. Every live-only finding above (`TOKEN_AUTH_DISABLED`, the two missing nginx routes, the
`includes`/`excludes` field-name gotcha, the anonymous-registry rate limit, the distribution
delete cascade) was independently confirmed against the real dev Pulp instance and a real
`podman pull`, not assumed from the schema alone.

## Milestone 4 — Ansible

VERIFIED against a live pulpcore 3.116.0 / pulp_ansible 0.30.0 instance (schema fetched from
`/pulp/api/v3/docs/api.json?component=ansible`, and every non-trivial flow below exercised for
real: repository/remote/distribution CRUD, a real collection upload built with
`ansible-galaxy collection build`, a real role upload via the generic Artifacts endpoint,
namespace create/update, and a cross-repository search).

- [x] Repositories (list/detail/create/edit/delete) - name-based routing
      (`/ansible/repositories/:name`), same rationale as RPM. Fields beyond RPM's:
      `retain_repo_versions`, `gpgkey` (verify signed collections against), `private`. **No
      autopublish/publish concept at all** (VERIFIED live schema: `AnsibleDistribution` has no
      `publication` field) - a distribution serves the repository directly, so content is
      servable as soon as it's created, unlike RPM.
- [x] Remotes - **three distinct flavors**, not a two-way toggle like RPM's Standard/ULN:
      `Collection` (Galaxy/Automation Hub - has `requirements_file`/`auth_url`/write-only `token`
      to scope a sync to specific collections and authenticate to Automation Hub),
      `Git` (clones roles from a git repo; VERIFIED live schema: **no `policy` field at all**,
      unlike every other remote in this app, plus `git_ref`/`metadata_only`), and `Role` (classic
      pre-collections Galaxy roles, same shape as a standard RPM remote). All three support
      create (sync, 201)/update (async, 202+task)/delete.
- [x] Distributions (list/create/delete, per-repository tab, same rationale as RPM) - each row
      shows a copyable `ansible.cfg` client-configuration snippet built from the distribution's
      own `client_url` (VERIFIED live schema field) so `ansible-galaxy`/Automation Hub clients can
      point at it directly.
- [x] Collections (collection versions - global list + per-repository tab, upload). VERIFIED
      live: upload is **asynchronous** (202+task) via `content/ansible/collection_versions/`
      directly with `file`+`repository` (one step, unlike RPM packages) - the older
      `/ansible/collections/` one-shot upload endpoint (which returns a separate `CollectionImport`
      resource for richer progress messages) is marked `deprecated` in the live schema, so this app
      uses the modern endpoint and tracks the plain task like any other async operation - no
      bespoke import-progress UI needed. **Real gotcha hit building a test fixture**: Pulp
      rejects a collection tarball missing `meta/runtime.yml`'s `requires_ansible` field with a
      clear `FileParserError`, surfaced as a normal task failure.
- [x] Roles (classic pre-collections role content - global list + per-repository tab, upload).
      VERIFIED live schema: **`ansible.Role`'s content-create endpoint only accepts a pre-existing
      `artifact` href** (no `file`/`upload` alternative fields the way `CollectionVersion` has) -
      upload is therefore a genuine two-step flow (POST the file to pulpcore's generic
      `/pulp/api/v3/artifacts/` to get an Artifact href, then POST that href + name/namespace/
      version/repository to the role content endpoint), unlike collection version upload. Create
      is synchronous (201, no task). **Real bug caught by the e2e spec**: the generic Artifacts
      endpoint synchronously rejects (400, "Artifact with sha256 checksum of '...' already exists")
      a file whose exact bytes were already uploaded before - unlike RPM packages/collection
      versions, which dedup transparently through their own content-specific upload endpoints. Hit
      for real re-running the e2e spec (same fixture tarball, second run). Fixed by checking
      `GET /pulp/api/v3/artifacts/?sha256=<hash>` (computed client-side via Web Crypto,
      `crypto.subtle.digest`) before creating one - see `findOrCreateArtifact` in
      `src/api/client/ansible/roles.ts`.
- [x] Namespaces (Galaxy namespace profiles - company/email/description/avatar). **Two genuinely
      different things share the name "namespace"**: a read-only, sync-derived content type
      (`content/ansible/namespaces/`, not directly managed here) and this page's _editable_ Galaxy
      namespace, which only exists inside one distribution's own Galaxy-compatible API mount - not
      a global resource, hence the page starts with a distribution picker. VERIFIED live: create/
      update/delete are all **asynchronous** (202+task, confirmed against the live schema after
      initially assuming create was synchronous like most other creates in this app - always
      check, never assume). VERIFIED live gotcha: the `pulp_href` a namespace list/get response
      returns points at the _read-only_ content-type resource and 405s on PATCH - update/delete
      must instead be addressed by distribution + name back through the same namespace collection
      URL. Delete is rejected (400) while the namespace still has collections associated with it -
      a real Pulp validation error, not pre-checked by Pulpit. `links` (arbitrary labeled URLs) and
      full-domain-aware routing (`links`/avatar as a nested multipart shape) aren't editable in
      this first pass.
- [x] Signing & marks - a repository's Overview tab exposes **Sign content…** (signs every
      collection version currently in the repository via a signing service configured on Pulp -
      picking/configuring signing services themselves is Milestone 6 scope, this only _uses_ one
      already set up) and **Mark…**/**Unmark…** (attaches/removes an arbitrary label across the
      repository's content). Both operate on `["*"]` (every content unit) rather than a
      per-content-unit picker, a deliberate scope simplification. Collection signatures and marks
      created this way are now browsable too - the Overview tab shows a signature count and the
      set of applied mark labels, backed by dedicated read-only adapters/hooks
      (`collectionSignatures.ts`/`collectionMarks.ts`) that were built during the Ansible sprint
      but initially left unwired (a rules-compliance audit against RPM's conventions caught this
      as dead code and it was wired up in a follow-up pass).
- [x] Deprecate a collection (`content/ansible/collection_deprecations/`, a **Deprecate
      collection…** action on the global Collections page) - marks every version of a
      namespace+name collection as deprecated; VERIFIED live: **asynchronous** (202+task), and
      there's no un-deprecate action (no DELETE on this resource in the live schema). Deprecation
      is a property of the namespace+name pair, not a specific repository/version - the API still
      requires a `repository` field to associate the marker with, per the schema. Like signing/
      marks, this adapter was built earlier in the Ansible sprint but left unwired until the same
      follow-up audit caught it.
- [x] Search (`/ansible/search`) - finds a collection across every repository at once via
      pulp_ansible's Galaxy-v3-compatible cross-repository search. **VERIFIED live: this one
      endpoint uses a different pagination envelope** (`{meta: {count}, links, data}`) from every
      other list endpoint in this app (including the Galaxy namespace _list_ endpoint, which,
      despite living under the same `/pulp_ansible/galaxy/...` mount, uses Pulp's normal
      `count`/`next`/`previous`/`results` shape) - assumed to match at first and had to be
      corrected after a live check showed the search page stuck on an empty state. Also VERIFIED
      live: the index returns at most one row per collection-version _content unit_, not one per
      (repository, content unit) pair - uploading the same tarball to a second repository did not
      add a second row for it - so this can't be used to know every repository holding a given
      version.
- [x] Copy repository-version content to another repository (`ansible/copy/`, a "Copy to…" action
      on the current version in the Versions tab) - same generic, whole-version-only shape as
      RPM's `rpm/copy/` (a more specific `copy_collection_version` repository action exists in the
      live schema for per-content-unit copy/move with signing, not built here to avoid a
      content-unit-picker UI this milestone doesn't otherwise need).
- [x] **Infrastructure fix found during this milestone**: the nginx reverse proxy
      (`deployment/docker/nginx/pulpit.conf.template`) only proxied `/pulp/api/`, `/pulp/content/`, and
      `/v2/` to Pulp - `/pulp_ansible/...` (the entire Galaxy-v3-compatible API namespace/search
      lives under) fell through to Pulpit's own SPA fallback. A GET request there silently
      "succeeded" with Pulpit's own `index.html` instead of Pulp's JSON, and a POST 405'd (a
      static-file location rejecting the method) - both looked like frontend bugs until checked at
      the network level. Fixed with a new `location /pulp_ansible/` proxy block.
- [ ] Generic object-level RBAC (`add_role`/`remove_role`/`my_permissions`, present on nearly
      every Ansible resource in the live schema) - out of scope for this milestone, deferred to
      Milestone 5 (Access) since it's a pulpcore-wide capability, not Ansible-specific.
- [ ] A full read-only browser for pulp_ansible's Galaxy-v3 client API (docs-blob viewers,
      artifact download proxies, the `tags` endpoint) - that surface exists for `ansible-galaxy`/
      Automation Hub _clients_ to consume directly, not something an admin needs a Pulpit page
      for; exposed instead as the copyable `ansible.cfg` snippet on each distribution.

Tests: unit tests for the RPM-shared `RemoteConnectionSettingsFields` promotion (moved from
`src/features/rpm/remotes/` to `src/components/`, now used by both RPM and Ansible remotes) plus
adapter/component tests under `src/api/client/ansible/` and `src/features/ansible/*`, and an
end-to-end Playwright smoke pass (`e2e/ansible.spec.ts`). Every live-only finding above (the
missing nginx route, the namespace href/async gotchas, the search pagination envelope mismatch,
the role upload two-step flow and its artifact-sha256-dedup fix, the collection
`meta/runtime.yml` requirement) was independently confirmed against the real dev Pulp instance
before being relied on in code, not assumed from the schema alone - see docs/PULP_API.md "Ansible
endpoints". The artifact-dedup bug specifically was caught by the e2e spec itself failing on its
second run, not by manual testing - a real regression test, not just a smoke test.

## Cross-cutting: Accessibility audit

A whole-app accessibility pass (not scoped to one milestone), triggered by an explicit request to
maximize accessibility and ease of use across every page, not just newly-built ones.

- [x] Static linting: `eslint-plugin-jsx-a11y`'s recommended ruleset was already wired into
      `eslint.config.js` and passing clean across the whole codebase - confirmed still true, not
      newly added.
- [x] Automated runtime scanning (`e2e/a11y.spec.ts`, using `@axe-core/playwright` - a new
      dev-only dependency, justified because static JSX linting can't see PatternFly's rendered/
      computed DOM, e.g. actual contrast values or generated ARIA attributes): every static route
      in the app, the login page, a representative page in dark theme, the Create Repository
      modal, and the Help panel are each scanned against WCAG 2.1 A/AA - **zero violations found**,
      reflecting PatternFly's own accessibility baseline plus the jsx-a11y linting already in
      place.
- [x] Manual keyboard-operability checks (`e2e/a11y.spec.ts`'s "keyboard operability" suite) caught
      two real, fixed gaps that automated scanning alone did not: - The Tasks/Help notification drawer (`AppLayout.tsx`) didn't close on Escape and didn't
      return focus to the button that opened it - unlike `Modal`, PatternFly's `Drawer`/
      `NotificationDrawer` don't provide this behavior for free. Fixed with a shared
      Escape-key handler and a "remember what had focus before opening, restore it on close"
      effect in `AppShell`, covering the header's own Close button too, not just Escape. - The Help panel's title (`HelpPanel.tsx`) was a plain styled `<span>`, not a heading -
      invisible to screen-reader users navigating by headings, unlike the Tasks drawer's real
      `<h1>` (`NotificationDrawerHeader`'s `title` prop). Fixed by rendering it as
      `<Title headingLevel="h1" size="lg">` instead, matching Tasks exactly. - VERIFIED as already correct, not assumed: the skip-to-content link is genuinely the first
      Tab stop and does move focus to `#pulpit-main-content` - an early manual check pressed Tab
      before the app had finished its initial auth-check spinner and wrongly suggested
      otherwise; re-checked after waiting for the real UI to mount.

## Milestone 5 — Access

VERIFIED against a live pulpcore 3.116.0 instance (schema fetched from
`/pulp/api/v3/docs/api.json`, and every flow below exercised for real: creating a user, a custom
role, a group, assigning roles both globally and scoped to a real RPM repository, and revoking
one specific assignment without touching others).

- [x] **The whole domain is synchronous** - VERIFIED live: every mutation here (users, groups,
      roles, role assignments, group membership, and the generic per-object `add_role`/
      `remove_role`) returns its result directly (200/201/204), never a task. Unlike RPM/Ansible/
      Container, none of the mutation hooks in `src/features/access/` use `registerTask`.
- [x] Users (`/access/users`, list/detail/create/edit/delete) - name-based routing
      (`/access/users/:username`), same rationale as every other name-based route in this app,
      looked up via `username` exact-match filter since the real href uses a numeric id. Edit
      covers profile fields, `is_staff`/`is_active`, and a password reset (blank leaves the
      current password unchanged - VERIFIED live: a GET never echoes it back, same write-only
      pattern as every remote's proxy/auth credentials elsewhere in this app). **`is_superuser`
      is not exposed by the API at all** (readable, writable, or filterable) - VERIFIED live, it
      only appears in the `ordering` parameter's auto-generated doc string, not as a real field;
      true Django superuser status can't be managed through this UI, only server-side.
- [x] Groups (`/access/groups`, list/detail/create/delete - no rename, a deliberate scope cut for
      this single-field object) - a **Members** tab (add/remove users) and a **Roles** tab
      (assign/revoke, shared with Users - see below). **VERIFIED live gotcha**: removing a member
      is addressed by `{group}users/{user's numeric id}/`, not by username - the add-member
      response's own `pulp_href` is the _user's_ href (e.g. `/pulp/api/v3/users/1/`), not a
      separate membership-specific one, which is what that id is parsed from
      (`groupUserId()` in `src/api/client/access/groups.ts`).
- [x] Roles (`/access/roles`) - defaults to a **Custom** filter (unlocked, user-created roles);
      **Built-in** shows the ~180 roles pulpcore/plugins ship out of the box (the viewer/owner/
      creator pattern per content type per plugin), read-only - **VERIFIED live: both PATCH and
      DELETE on a locked role are rejected with `403 "The role is locked."`**, which the UI
      pre-empts by simply not rendering Edit/Delete for them rather than surfacing that error.
      There's no dedicated "list every available permission" endpoint, so the Create/Edit role
      modal's permission picker (`PermissionsPicker.tsx`, a filterable checkbox list, not a
      PatternFly `Select` - this app had no prior use of that component and a simpler primitive
      fit better for ~336 items) derives its options from every permission already used by _some_
      role, built-in or custom - the best available source, with the accepted gap that a
      permission belonging to zero current roles wouldn't appear.
- [x] Role assignments - a **Roles** tab on both Users and Groups (`AssignRoleModal.tsx`, shared
      between them) grants a role either **globally** (`content_object: null`) or **scoped to one
      object** (paste its href). **VERIFIED live gotcha**: POSTing without `content_object` at all
      is rejected (`400`, "Either 'content_object' or 'content_object_prn' needs to be
      specified") - a global assignment must send `content_object: null` explicitly, which the
      modal always does.
- [x] Object-level permissions - every RBAC-protected object across every plugin exposes the same
      generic `add_role`/`remove_role`/`list_roles`/`my_permissions` actions (VERIFIED live schema,
      identical shape regardless of plugin/content type), which are a convenience layer over the
      same UserRole/GroupRole records the Users/Groups Roles tabs manage - granting access one way
      shows up the other way too. Wired into a shared **Access** tab
      (`src/features/access/ObjectAccessTab.tsx`) added to every Repository detail page across
      RPM, Ansible, and Containers - flattens the API's per-role `{role, users, groups}` shape
      into one row per (role, subject) pair so revoking one user/group doesn't touch anyone else
      with the same role. **VERIFIED live, a genuinely surprising behavior worth calling out
      explicitly here**: Pulp automatically grants the _creator_ of an object an "owner" role on
      it - a freshly created repository's Access tab is never actually empty for its creator, only
      for everyone else. Scoped to Repositories only for this pass, not also Remotes/
      Distributions - the highest-value target, extendable later with no backend work (just adding
      the same tab elsewhere).

Tests: unit tests for every Access API adapter (`src/api/client/access/*.test.ts`, MSW-mocked,
including the generic per-object handlers matched by URL suffix rather than one mock per resource
type) plus component tests for every page/tab/modal, and an end-to-end Playwright spec
(`e2e/access.spec.ts`) exercising the full user → role → group → object-level-permission lifecycle
against the real Compose stack. Every live-only finding above (the fully-synchronous domain, the
locked-role rejection, the global-assignment `content_object: null` requirement, the group-member
numeric-id addressing, the auto-granted-owner-role behavior) was independently confirmed against
the real dev Pulp instance before being relied on in code, not assumed from the schema alone - see
docs/PULP_API.md "Access endpoints".

## Milestone 6 — Enterprise hardening

- [x] LDAP authentication (`/admin/ldap`) - **Superseded the "nothing to build here" call below**:
      although Pulp exposes zero REST API surface for `AUTH_LDAP_*`/`AUTHENTICATION_BACKENDS`
      (they're raw Django settings, unlike SAML's dynaconf-wired `SAML_CONFIG`), `pulpit-core`
      applies them directly via its own colocated reconciler (`pulpit-core/app/modules/ldap/`),
      the same mechanism already used for repository signing - see `docs/AUTHENTICATION.md`. The
      page covers server/bind/user/group search config and a "Test connection" action that binds
      against the directory before applying anything. LDAP group mirroring populates Django's
      standard `Group` model, so mirrored groups appear in Pulpit's existing Groups UI (Milestone 5) with no additional work.
- [ ] SSO/reverse-proxy auth validation against a real deployment - **investigated, nothing to
      build here**. VERIFIED live (container inspection of the pulp image's installed packages,
      Django settings, and the full OpenAPI schema): Pulp supports reverse-proxy/header SSO via
      `RemoteUserBackend`/`RemoteUserMiddleware` (`REMOTE_USER_ENVIRON_NAME` setting present), but
      it's configured through raw Django settings (`AUTHENTICATION_BACKENDS`/...) on the server
      itself, with **zero REST API surface** - unlike LDAP (above), pulpit-core has no reconciler
      for this yet. Per ADR 0001 (frontend-only, no config store of its own), there is nothing in
      Pulp's API for Pulpit to build a UI around without one; this is ops/deployment documentation,
      not a UI feature, unless/until a reconciler is built for it too.
- [x] Signing services UI (`/admin/signing`) - **read-only**, VERIFIED live against the schema:
      `signing-services/` supports `GET` only, no `POST`/`PUT`/`PATCH`/`DELETE` at all. Creating
      one requires a signing script plus a Django management command run on the Pulp server
      itself, entirely outside API/UI scope. The page lists name/fingerprint with a **View**
      action showing the public key and script path.
- [x] Content guards UI (`/admin/content-guards`) - full CRUD across all six flavors VERIFIED live
      against pulpcore-core + pulp_certguard: **Header** (`header_name`/`header_value`/
      `jq_filter`), **RBAC** (no extra fields, access managed via the generic per-object RBAC
      actions), **Content redirect** (no extra fields - Pulp's own internal signed-URL mechanism,
      not usually hand-created), **Composite** (`guards`: array of other guards' hrefs), and
      **X.509**/**RHSM** certificate (`ca_certificate` PEM string, both otherwise identical). All
      mutations are synchronous (200/201/204, never a task), consistent with the rest of the
      Access/Administration domain. Kept deliberately simple (one list page + modals, no detail
      page/routing) per explicit direction to keep this milestone's scope to what Pulp's API
      actually supports. **VERIFIED live gotchas**: the generic `contentguards/` list endpoint
      (used to show one unified table) only returns base fields (`pulp_href`/`prn`/`name`/
      `description`) - a guard's flavor has to be read out of its `prn` (e.g.
      `prn:core.headercontentguard:<uuid>`), there is no `type` field; DELETE works via any
      guard's own href regardless of flavor (the href already encodes the specific-flavor path);
      and RBAC content guards reuse the _exact_ same generic `add_role`/`remove_role`/
      `list_roles` mechanism built for repositories in Milestone 5, including the same
      auto-owner-role-on-creation behavior - so the existing `ObjectAccessTab` component
      (Milestone 5) is reused directly for guard access management with zero new logic.
- [x] Improved auditability - the **Tasks** page (`/tasks`) was rebuilt from a session-only list
      into a browser for Pulp's own **persistent** task history. **VERIFIED live gotcha, the
      motivating discovery**: every mutation across the whole app already lands in Pulp's
      `/pulp/api/v3/tasks/` record (`created_by`, `logging_cid`, full timestamps,
      `reserved_resources_record`/`created_resources`, and the real error on failure) - a
      complete, Pulp-owned audit trail that had zero UI before this. The page adds state
      filtering, a name search, pagination, and a **View details** modal (state, who triggered
      it, when, which resources it touched, and - for a failed task - Pulp's actual error
      message). `created_by` is a user href resolved to a username via a small
      `useUserQuery(href)` hook (new `getUser(href)` adapter,
      `src/features/access/users/useUserQuery.ts`) - falls back to "System" for
      system-initiated tasks (`created_by: null`, VERIFIED live) and to the raw href while the
      lookup is in flight. **Kept deliberately separate from the masthead Tasks drawer**
      (`src/api/tasks/TasksContext.tsx`/`TasksDrawer.tsx`), which still only tracks tasks
      triggered in the current browser tab for live in-flight feedback - the two serve different
      purposes and neither replaces the other. **VERIFIED live gotcha**: the tasks list endpoint
      has no `created_by` filter at all, despite returning the field - filtering by user isn't
      possible server-side, so the page doesn't offer it.
- [x] API/version-compatibility handling across pulpcore/plugin versions - two parts, both driven
      by the same `/pulp/api/v3/status/` `versions` array already used for the System status page:
  - **Nav gating**: a plugin's whole nav group (RPM/Containers/Ansible) is hidden if the
    connected instance's status doesn't report that component - so pointing Pulpit at a
    Pulp deployment without, say, pulp_ansible installed no longer leaves a dead nav section
    whose every page would just 404. **A rules-compliance audit finding**: this is what
    `src/api/capabilities.ts` (`deriveCapabilities`, `PulpitCapabilities`) was already for -
    it existed with its own passing unit test but had never actually been imported anywhere
    in the app, exactly the kind of dead-but-documented code this project has caught before
    (see the Ansible signing/marks adapters note, Milestone 3). Wired into `AppNav.tsx` here
    via `navTree.ts`'s new optional `capability` field, rather than duplicating the
    derivation logic. **Fails open**: while status is loading, on a status request error, or
    if a future pulpcore build ever omits `versions` entirely, every group is shown rather
    than hiding real navigation over an unrelated/transient problem - `deriveCapabilities`
    itself returns all-false for undefined status (its own existing test asserts this, by
    design, so it never _assumes_ a capability), so the fail-open behavior is layered on top
    in `AppNav` (only filter once status has actually resolved), not inside
    `deriveCapabilities`.
  - **Version compatibility surfacing**: the System status page's version table gained a
    **Compatibility** column comparing each reported component's version (major.minor only -
    patch differences aren't worth flagging) against the version this app was last VERIFIED
    against for that component, per the per-milestone notes in this file (a small
    `src/lib/pulpCompatibility.ts` baseline: currently core 3.116.0, rpm 3.38.5, ansible
    0.30.0, container 2.29.0) - "Matches verified", "Newer/Older than verified", or "Not
    verified" for every other reported component Pulpit has no UI for at all (deb, gem,
    hugging_face, maven, npm, ostree, python, certguard, file on the live dev instance).
    Deliberately simple: a static baseline updated by hand alongside each milestone's own
    VERIFIED notes, not a live compatibility-matrix fetch - there's no such endpoint to fetch
    from.
  - External authentication (LDAP/SSO/reverse-proxy) compatibility was investigated separately,
    above, and needs no code - only ops documentation, which is the one part of this bullet
    still open (folded into the deployment-hardening docs bullet below).
- [ ] Production deployment hardening docs (beyond the local dev Compose setup) - still open;
      should also cover the external-auth findings above (LDAP/SSO/reverse-proxy config is
      entirely server-side, no Pulpit involvement).

Tests: unit tests for the signing-services and content-guards API adapters
(`src/api/client/administration/*.test.ts`, MSW-mocked, including a dedicated
`contentGuardKindFromPrn` test covering all six flavors), component tests for both pages/modals
(`src/features/administration/{signing,contentGuards}/*.test.tsx`), and an end-to-end Playwright
spec (`e2e/administration.spec.ts`) exercising the full content-guard lifecycle (create Header,
edit it, create RBAC + verify its auto-granted owner role via the Access modal, create Composite
referencing both, delete all three) against the real Compose stack. Every live-only finding above
was independently confirmed against the real dev Pulp instance before being relied on in code, not
assumed from the schema alone - see docs/PULP_API.md "Administration endpoints".

Auditability and version-compatibility additions: unit tests for `listTasks`/`getUser`
(`src/api/client/tasks.test.ts`, `src/api/client/access/users.test.ts`) and
`compatibilityStatus` (`src/lib/pulpCompatibility.test.ts`), component tests for the rebuilt
`TasksPage` (state filtering, empty/error states, the detail modal) and for `AppNav`'s
fail-open gating behavior (`src/app/layout/AppNav.test.tsx` - covers "hides an absent plugin",
"shows everything while loading", and "shows everything on a status error", none of which the
live dev instance can exercise on its own since it has every plugin installed), plus new
end-to-end assertions in `e2e/app.spec.ts` confirming the real dev instance's task history and
version-compatibility labels render correctly against the live Pulp instance (570+ real tasks
accumulated from every other e2e spec run against this same stack, and every UI-covered
component's version reported as "Matches verified" since this dev stack is exactly what
Pulpit's baseline was captured from).

## Milestone 7 — pulpit-core & repository signing key management

New backend component, `pulpit-core`/`pulpit-worker` (ADR 0006), and its first module,
`docs/signing.md`. Summary; see that document for the full design, live-verified Pulp mechanisms,
and known limitations.

- [x] `pulpit-core`: FastAPI service, own Postgres database, modular structure
      (`app/core/{config,database,events,jobs}`, `app/adapters/pulp/`, `app/modules/<name>/`) so a
      future module (validation, notifications, scheduled maintenance, ...) has a proven place to
      live without touching the signing module.
- [x] `pulpit-worker`: separate privileged process/container - the only one with the GPG signing
      volume mounted (VERIFIED shared-volume permission scheme against `pulp:stable`'s actual
      runtime uid/gid, `docs/signing.md` "Shared volume permissions").
- [x] Signing module: configurable identity/algorithm/validity/rotation policy (no hardcoded
      organization name - task requirement), `LocalGPGKeyManager` behind a `KeyManager` interface
      (swappable for Vault/HSM/KMS later), explicit `NEXT`/`ACTIVE`/`RETIRING`/`RETIRED` key
      lifecycle, scheduled automatic rotation (disabled by default), public key distribution at a
      stable `/keys/<filename>` URL. **Superseded by the single-active-key model below** - see
      the follow-up entry.
- [x] Real Pulp integration, VERIFIED end-to-end against a live Compose stack (not just unit
      tests): logged in as the real Pulp admin through the actual nginx proxy, generated a real
      GPG key, registered both `RpmPackageSigningService` and `AsciiArmoredDetachedSigningService`
      Pulp signing services via the documented manual `pulpcore-manager add-signing-service`
      step, watched `pulpit-worker`'s scheduler detect completion and activate the key
      automatically, created a real RPM repository, and confirmed
      `package_signing_service`/`package_signing_fingerprint`/`metadata_signing_service` were set
      correctly via a real Pulp task. This pass caught and fixed three real integration bugs no
      amount of mocking would have surfaced: `rpmsign` prints its own progress line to stdout,
      breaking pulpcore's JSON-parsing contract; `package_signing_service` isn't a filterable
      query parameter on the repository list endpoint despite being a real field; and Pulp
      normalizes a written fingerprint to a `v4:`-prefixed form on read. All three are documented
      in `docs/signing.md` "Known limitations" and fixed in code, not just noted.
- [x] Docs: ADR 0006, `docs/signing.md`, and updates to ADR 0001/
      `docs/ARCHITECTURE.md`/`docs/SECURITY.md`/`docs/DEPLOYMENT.md` describing exactly what
      changed and why, rather than leaving the superseded "no backend, ever" language standing.

Tests (at this milestone): 77 backend tests (`pulpit-core/tests/` - pytest against a real
disposable Postgres, per that project's own established "mocks are a convenience, real
integration is mandatory" policy), covering rotation threshold logic in isolation, key state
transitions, the Pulp adapter (respx-mocked HTTP boundary), the public key endpoint, no-private-
key-in-API-response guarantees, and a real (non-mocked) GPG round trip. Frontend tests cover the
new Administration → Signing pages and the RPM repository Signing section - see
`src/features/administration/repositorySigning/*.test.tsx` and
`src/features/rpm/repositories/*.test.tsx`.

### Follow-up — automated Pulp registration, mandatory resign-on-publish, single active key

Reworked shortly after the above, on explicit request, once real usage surfaced two rough edges:
manually running `add-signing-service` on every key change was tedious, and "old+new key
coexistence during rotation" meant a repository's trusted key set only ever grew, never shrank.

- [x] "Repository-wide re-sign" is no longer a non-goal: `resign_repository_packages_job`
      downloads each package via the repository's own published metadata (its `location_href`
      field is **not** reliable for this - VERIFIED live; the real served path only exists in
      generated `primary.xml.gz`), re-signs it locally with `rpmsign`, and re-uploads it, since
      Pulp still has no bulk re-sign API to build on. VERIFIED end-to-end: 35/35 real packages in
      a live repository resigned and independently verified with `rpm -K`. See `docs/signing.md`
      "Publishing: what actually happens" / "How resigning existing packages actually works".
- [x] Resigning existing content and republishing metadata on a key publish is now **mandatory,
      not a disableable setting** (`resign_existing_packages_enabled` removed) - explicit user
      decision to keep the trust story simple rather than offer a footgun.
- [x] **Single active key model**: "activate" was renamed to **publish** throughout
      (`/keys/{id}/rotate` → `/keys/{id}/publish`) and the public key endpoint now serves only the
      current `ACTIVE` key - no more old+new coexistence, so a repository's `gpgkey=` URL never
      needs to carry more than one trusted key at a time. `RETIRING` is now a historical/audit
      state only.
- [x] `PulpCommandExecutor` (`app/adapters/pulp/executor.py`): automates the previously-manual
      `add-signing-service` step via a swappable interface (`DockerExecExecutor` using a scoped
      `docker-socket-proxy`, never the raw Docker socket) so a non-Docker deployment isn't forced
      into it - see ADR 0006 "Alternatives considered" for the narrow, explicit reversal of that
      ADR's original Docker-socket rejection, and `docs/signing.md` "Automating the manual Pulp
      step". VERIFIED end-to-end: a real signing service registered itself automatically with zero
      manual steps.
      **Superseded by ADR 0008**: this whole executor/exec-in mechanism was later removed in favor
      of a reconciler colocated inside a derived Pulp image - see that ADR for why.
- [x] Two real bugs caught live during this pass and fixed with regression tests: the bootstrap
      command was missing the required `--home <gnupg_home>` flag (failed with "No public key");
      `SigningKey`/`Job` timestamp columns were naive instead of `DateTime(timezone=True)`, causing
      "can't compare offset-naive and offset-aware datetimes" in the rotation scheduler - caught
      only by a test that round-trips through a real Postgres, not by unit tests alone. Both are
      documented in `docs/signing.md`.

Tests (current): 97 backend tests, 426 frontend/vitest tests, 51 e2e tests.

## Explicit non-goals (see ADR 0001, ADR 0006)

- A Pulpit-owned backend, database, or auth/RBAC system for _Pulp's own data_ (repositories,
  content, users, permissions, tasks), ever - see ADR 0006 for the one narrow, deliberate exception
  (signing key custody) and why it doesn't reopen this rule for anything else.
- Reimplementing Pulp features Pulpit can already delegate to Pulp's API.
