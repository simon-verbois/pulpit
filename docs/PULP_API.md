# Pulp API integration

Pulp's REST API is the authoritative contract. This document covers discovery, generated types,
async tasks, pagination, and the error model. See also ADR 0004 and the `pulp-api` skill.

## Status / version / capability discovery

`GET /pulp/api/v3/status/` (same-origin, no trailing slash changes) reports installed
components/versions, storage, and worker/app info.

**VERIFIED** (captured against the bootstrap dev Compose stack, pulpcore 3.116.0): the response
includes `versions` (array of `{component, version, package, module, domain_compatible}`),
`online_workers`, `online_api_apps`, `online_content_apps` (each an array of `{name,
last_heartbeat, versions}`), `database_connection: {connected}`, `redis_connection: {connected}`,
`storage: {total, used, free}` (bytes), `content_settings`, and `domain_enabled`. The dev instance
reported far more plugins than the four in this project's reference environment — `core`, `rpm`,
`container`, `ansible`, plus `deb`, `gem`, `hugging_face`, `maven`, `npm`, `ostree`, `python`,
`certguard`, `file` — confirming the field names above but _not_ the specific plugin set, which is
genuinely per-deployment. Do not assume Pulpit's dev-reference versions (pulpcore 3.116.0,
pulp_rpm 3.38.5, pulp_container 2.29.0, pulp_ansible 0.30.0) or component list are what any given
deployment reports; re-derive both from this endpoint every time. `src/api/client/status.ts`'s
`PulpStatus` type reflects this verified shape (all fields still optional, since other pulpcore
versions may differ). Pulpit's capability map (`capabilities.rpm` / `capabilities.container` /
`capabilities.ansible`) is derived from the `versions` component list at runtime — see
`docs/ARCHITECTURE.md`.

## OpenAPI schema discovery

Typical locations (**verify against the live instance before relying on them** — plugin schema
filtering support in particular varies by Pulp version):

- `/pulp/api/v3/docs/api.json` — combined OpenAPI schema.
- `/pulp/api/v3/docs/` — human-readable API docs.
- Per-component filtering: **VERIFIED** on this instance (pulpcore 3.116.0, re-confirmed on
  3.116.1), `?component=<name>` (e.g. `?component=rpm`) on `api.json` scopes the schema to one
  plugin - `scripts/api/fetch-schema.mjs` actually relies on this now (one fetch per component),
  not just a documented possibility. Confirm the exact parameter and behavior against the live
  instance's docs/schema if pointing this at a different pulpcore version; do not assume it works
  identically across versions.

**Known issue (not a Pulpit bug, upstream/Pulp-side): `/pulp/api/v3/docs/` (Pulp's own bundled
ReDoc page, linked from Pulpit's masthead "Help") is severely laggy on the "stable" all-in-one
Pulp image.** Diagnosed with a real CDP performance profile (not guesswork): the combined schema
across every installed plugin (pulpcore + rpm + container + ansible + acs, ...) is 906 endpoints /
6.7 MB, and ReDoc renders **all of it into the DOM at once with no virtualization** — 636,414 DOM
nodes, 338 MB JS heap, 6-7s of main-thread CPU just for the initial render, and every subsequent
scroll/hover stays slow afterward (huge style recalculation over that many nodes). Confirmed the
`?component=rpm` filter fixes this proportionally: same profiling technique against the
RPM-scoped schema (99 endpoints / 0.75 MB) showed 69,527 nodes, 51 MB heap, ~1s CPU — roughly a
6-9× reduction across every metric. Pulp's own `/pulp/api/v3/docs/` HTML page does **not** forward
a `?component=` query param from its own URL into ReDoc's `spec-url`, so linking to
`/pulp/api/v3/docs/?component=rpm` does not help - only serving a page that embeds ReDoc directly
against the filtered JSON would. Decided **not** to build that (a Pulpit-hosted docs viewer would
need updating every milestone, and duplicates something Pulp already provides) - Help still links
to Pulp's own full docs page as-is; this is left here as a verified diagnostic for the future, not
a TODO.

`npm run api:fetch` fetches all four component-scoped schemas (`?component=core|rpm|container|
ansible`) into `src/api/schemas/*.json` (gitignored, purely intermediate); `npm run api:generate`
runs `openapi-typescript` against each into its own checked-in
`src/api/generated/{core,rpm,container,ansible}/schema.d.ts` (see ADR 0004 and that directory's
own README for what's actually committed and why).

## Generated types -> adapters -> query hooks

See ADR 0004. Generated files under `src/api/generated/` are never hand-edited. Adapters in
`src/api/client/` are the only place that constructs request paths/bodies; feature code consumes
TanStack Query hooks built on top of those adapters.

## Async tasks

Many mutating operations (sync, publish, import, delete-with-cleanup) return
`{"task": "<task href>"}` (HTTP 202) instead of completing inline; others complete synchronously
(HTTP 200/201/204). **Do not assume either way for a given endpoint** — check the live response.
See `docs/ARCHITECTURE.md` "Tasks" and the `pulp-tasks` skill for the polling abstraction and UI
conventions. Never fabricate progress percentages Pulp doesn't report.

`GET /pulp/api/v3/tasks/` is Pulp's own **persistent** task history (VERIFIED against a live
pulpcore 3.116.0 instance with 570+ real tasks accumulated from routine use) - every task any
client ever triggered, not just this session's. Fields worth calling out beyond the individual
`PulpTask` shape above: `created_by` (a user href, or `null` for a system-initiated task -
VERIFIED live), `logging_cid` (a correlation id), `reserved_resources_record`/
`created_resources` (arrays of `prn`s the task touched/created). **VERIFIED live gotcha**: the
list endpoint has no `created_by` filter at all, despite the field being present on every result

- filtering task history by user isn't possible server-side. Useful filters that do exist:
  `state`/`state__in`, `name__contains`, and `pulp_created`/`started_at`/`finished_at` range
  filters. This is the backing endpoint for Pulpit's `/tasks` page (docs/ROADMAP.md "Improved
  auditability") - distinct from the masthead Tasks drawer, which only tracks individual task
  hrefs returned by mutations made in the current browser tab (`src/api/tasks/TasksContext.tsx`).

## Distribution base-path policy

**VERIFIED in the derived reference Pulp image:** the `pulp-distribution-path-policy` extension
requires every plugin distribution `base_path` to begin with that plugin's public namespace
(`rpm/`, `container/`, `ansible/`, `file/`, `deb/`, `python/`, `gem/`, `maven/`, `npm/`,
`hugging-face/`, `ostree/`, `openpgp/`, or `artifact/`). The prefix must be followed by a non-empty
name. Validation runs before asynchronous dispatch, so an invalid POST, PUT, or base-path PATCH returns a synchronous
field-level HTTP 400. PATCH requests that omit `base_path` remain valid for legacy distributions.

This is a policy of Pulpit's derived reference image, not an upstream pulpcore guarantee. External
Pulp deployments must install an equivalent extension if direct API enforcement is required.

## Pagination

Pulp's list endpoints use limit/offset-style pagination with `count`/`next`/`previous` in the
response envelope. Confirm the exact parameter names and envelope shape against the live schema
for each resource before wiring up a new list view; don't assume every list endpoint paginates
identically.

## Repository href semantics

Pulp repositories, repository versions, and most other resources are addressed by opaque href
URLs, not simple numeric/UUID IDs. Pulpit's browser routes use stable, human-readable UI
slugs/IDs (see `docs/UX.md` / routing) and keep the actual Pulp href inside the fetched resource
object / TanStack Query cache — hrefs are not encoded directly into browser URLs.

## RPM endpoints (VERIFIED against pulpcore 3.116.0 / pulp_rpm 3.38.5)

Captured against the live OpenAPI schema and a real sync while building Milestone 2
(`src/api/client/rpm/`, `src/features/rpm/`):

- **Sync vs. async is per-endpoint, not per-resource-type**: RPM repository and remote _create_
  are synchronous (`201`, no task). RPM _distribution_ create is asynchronous (`202` + task) even
  though it's also just an object create — don't assume create is always sync. All _delete_
  operations (repository, remote, distribution, repository version) are asynchronous (`202` +
  task).
- **A distribution serves a _publication_, not the repository directly**: a distribution with
  `repository` set only ever serves the latest _publication_ of that repository. Syncing/modifying
  a repository does **not** create one by itself unless the repository has `autopublish: true`
  (VERIFIED live: a distribution's `base_url` 404'd on `repodata/repomd.xml` for a repository that
  had real synced content but no publication). Publish explicitly with
  `POST /pulp/api/v3/publications/rpm/rpm/` `{"repository": "<repository href>"}` (async, `202` +
  task) - see `src/api/client/rpm/publications.ts`, the repository create form's "Automatically
  publish" checkbox, and the Overview tab's "Publish now" action.
- **Package upload is two steps, not one**: `POST .../content/rpm/packages/upload/` (multipart
  form, field `file`) only creates the content unit (sync, `201`) — it has no `repository` field
  to add the package to a repository in the same call, despite what its `overwrite` field's
  description text suggests. Adding the uploaded unit to a repository is a separate
  `POST <repository href>modify/` call with `{"add_content_units": ["<package href>"]}`
  (async, `202` + task).
- **Advisory upload's `file` is JSON, not `updateinfo.xml`**: `POST .../content/rpm/advisories/`
  (multipart, field `file`) is parsed with `json.loads(data["file"].read())` server-side and
  merged into the advisory's own fields (`id`/`title`/`type`/`description`/`pkglist`/
  `references`/...) — a raw updateinfo.xml upload fails with a JSON decode error (VERIFIED live).
  Unlike package upload, `repository` IS accepted directly here (one step, `202` + task) - see
  `src/api/client/rpm/advisories.ts`.
- **Some async operations return `{"task_group": <href>}`, not `{"task": <href>}`**: an Alternate
  Content Source refresh and `rpm/prune/` both do this (VERIFIED live); `rpm/copy/` returns a
  plain `{"task": <href>}` like everything else. Pulpit's task-tracking UI only understands single
  tasks, so a task-group response is resolved to its first task href (`getTaskGroup` in
  `src/api/client/tasks.ts`) and tracked normally — accurate for the common one-task-per-group
  case, not a general task-group UI.
- **An Alternate Content Source's remote must have `policy: "on_demand"`**: any other policy is
  rejected with a synchronous `400` (VERIFIED live) - the Create ACS form only offers on-demand
  remotes for this reason.
- **A remote's `proxy_username`/`proxy_password`/origin `username`/`password` are write-only**:
  a GET response never echoes them back, only whether one `is_set` (via `hidden_fields` -
  VERIFIED live). An Edit Remote form must show these fields blank with a "currently set" hint,
  not attempt to prefill the actual value.
- **A container-level `HTTP_PROXY`/`HTTPS_PROXY` env var does not affect Pulp's sync traffic at
  all** — VERIFIED by setting it on the `pulp` service pointed at a real Squid proxy and
  confirming (a) a manual `curl -x <proxy>` from inside the container reached it fine, but (b) a
  real repository sync triggered through the API never touched it. The only mechanism that works
  is the per-remote `proxy_url` field (confirmed separately: setting it on a remote and syncing
  DID produce a request in the test proxy's access log) - see `docs/DEPLOYMENT.md` "Outbound HTTP
  proxy for syncing".
- **ULN remotes require `username`/`password`**: unlike a standard RPM remote (where they're
  optional advanced fields), Oracle ULN remote create rejects a request missing either with a
  synchronous `400` (VERIFIED live) - modeled as a separate create form, not a variant of the
  standard one.
- **Repository lookup-by-name can return "no match"**: since Pulpit routes repositories by name
  (see "Repository href semantics" above), a name filter with zero results is a legitimate,
  expected case, not an error — model it as returning `null`, not `undefined`, from the adapter.
  TanStack Query v5 treats a `queryFn` resolving to `undefined` as an error ("Query data cannot
  be undefined"), which would silently replace an intended not-found UI with a generic error
  state (a real bug caught by an automated test — see `src/api/client/rpm/repositories.test.ts`).
- **A registered task is only actually polled once something not conditionally hidden mounts the
  hook that watches it.** PatternFly's `Drawer`/`DrawerPanelContent` only mounts its panel content
  once `isExpanded` has been true at least once (`node_modules/@patternfly/react-core/.../
DrawerPanelContent.js`), so a task-tracking hook that lives only inside a
  `NotificationDrawer`'s list items never runs until a user opens that drawer. Pulpit's fix: a
  headless `TaskTrackers` component (`src/features/tasks/TaskTrackers.tsx`) mounted unconditionally
  next to the drawer, so registering a task always starts polling/invalidation immediately.

## Ansible endpoints (VERIFIED against pulpcore 3.116.0 / pulp_ansible 0.30.0)

Captured while building Milestone 4 (`src/api/client/ansible/`, `src/features/ansible/`) - see
`docs/ROADMAP.md`'s Milestone 4 section for the full feature list. Highlights not already covered
by the RPM section above:

- **No publication concept at all**: VERIFIED live schema, `ansible.AnsibleDistribution` has no
  `publication` field - it points directly at a `repository`/`repository_version`. A distribution
  is servable as soon as it's created; there's no RPM-style "distribution 404s until the
  repository is published" trap here.
- **Three remote flavors with different shapes**, not a two-way toggle: `remotes/ansible/
collection/` (Galaxy/Automation Hub, has `requirements_file`/`auth_url`/write-only `token`),
  `remotes/ansible/git/` (clones roles from git; VERIFIED live schema: **no `policy` field at
  all**, unlike every other remote in this app), and `remotes/ansible/role/` (classic Galaxy
  roles, shaped like a standard RPM remote).
- **Collection version upload is one-step but asynchronous**: `POST content/ansible/
collection_versions/` with `file`+`repository` directly (202 + task) - the older `/ansible/
collections/` one-shot upload endpoint (which returns a separate `CollectionImport` resource for
  richer import messages) is marked `deprecated` in the live schema; use the modern endpoint and
  track its plain task like anything else.
- **Role upload is two steps, and the two steps differ from RPM's**: `ansible.Role`'s content-create
  endpoint only accepts a pre-existing `artifact` href (no `file`/`upload` alternative the way
  `CollectionVersion` has, and no dedicated `.../roles/upload/` shortcut the way RPM packages have)
  - upload a file to pulpcore's generic `POST /pulp/api/v3/artifacts/` first (multipart, sync 201),
    then POST that artifact's href + name/namespace/version/repository to `content/ansible/roles/`
    (sync, 201, no task). **VERIFIED live (caught by the e2e spec failing on its second run, not by
    manual testing)**: that generic Artifacts endpoint synchronously rejects (400, "Artifact with
    sha256 checksum of '...' already exists") a file whose exact bytes were already uploaded before,
    rather than transparently reusing it - unlike RPM packages/collection versions, which dedup
    through their own content-specific endpoints. `src/api/client/ansible/roles.ts`'s
    `findOrCreateArtifact` works around this by computing the file's sha256 client-side
    (`crypto.subtle.digest`) and checking `GET /pulp/api/v3/artifacts/?sha256=<hash>` before ever
    attempting to create one, making the upload idempotent for repeated identical content.
- **A real collection upload rejection worth knowing**: a collection tarball missing
  `meta/runtime.yml`'s `requires_ansible` field fails with a real, surfaced task error
  (`FileParserError: 'requires_ansible' in meta/runtime.yml is mandatory...`) - confirmed by
  building a real test collection with `ansible-galaxy collection build` and uploading it without,
  then with, that file.
- **Namespace management is per-distribution, and easy to get wrong**: the _editable_ Galaxy
  namespace (`/pulp_ansible/galaxy/default/api/v3/plugin/ansible/content/<distro_base_path>/
namespaces/`) is a completely different resource from the read-only, sync-derived
  `content/ansible/namespaces/` content type, despite sharing a name. VERIFIED live: create/
  update/delete on the editable one are all asynchronous (202+task) - initially assumed create was
  synchronous (like most other creates in this app) until checked. VERIFIED live gotcha: a
  namespace object's own `pulp_href` (from list/get) points at the _read-only_ content-type
  resource and 405s on PATCH - mutating it requires re-addressing by distribution base path + name
  through the namespace collection URL instead, not the href the API just handed back. Delete is
  synchronously rejected (400) while the namespace still has collections associated with it.
- **The cross-repository search endpoint uses a different pagination envelope than everything
  else**: `/pulp_ansible/galaxy/default/api/v3/plugin/ansible/search/collection-versions/` returns
  `{meta: {count}, links: {...}, data: [...]}`, not Pulp's normal `count`/`next`/`previous`/
  `results` - including the Galaxy namespace _list_ endpoint above, which despite living under the
  same `/pulp_ansible/galaxy/...` mount uses the normal Pulp shape. Assumed they'd match at first;
  a live check (the search page stuck on an empty state) caught the mismatch. Also VERIFIED live:
  the index returns (at most) one row per collection-version _content unit_, not one per
  (repository, content unit) pair - uploading the exact same collection tarball to a second
  repository did not add a second row for it, only the first repository that ever indexed it kept
  showing up. Don't rely on this endpoint to know every repository holding a given version.
- **The nginx reverse proxy needed a new route**: `deployment/docker/nginx/pulpit.conf.template` only proxied
  `/pulp/api/`, `/pulp/content/`, and `/v2/` to Pulp. The entire `/pulp_ansible/...` namespace
  (Galaxy namespaces, cross-repo search, and the client-facing Galaxy-v3 API) fell through to
  Pulpit's own SPA fallback instead - a GET returned Pulpit's own `index.html` with a 200 (looking
  like a legitimate but empty response) and a POST 405'd (nginx rejecting a non-GET method on a
  static-file location). Both were caught only by inspecting the actual network response, not by
  symptoms in the UI alone. Fixed with a `location /pulp_ansible/ { proxy_pass ...; }` block
  mirroring the existing Pulp routes.
- **Signing requires a pre-configured signing service**: a repository's `sign/` action needs an
  existing pulpcore signing service (`/pulp/api/v3/signing-services/`, read-only from Pulpit -
  creating one is a server-side script + Django management command, out of scope here). On a dev
  instance with none configured, the Sign action's picker is empty and the action can't be used -
  not a Pulpit bug, a deployment prerequisite (same category as Milestone 3's `TOKEN_SERVER`
  requirement for containers).
- **Deprecating an already-deprecated collection fails, asynchronously**: `collection_deprecations`
  enforces a DB-level unique constraint on `(namespace, name)` - re-deprecating a collection that's
  already deprecated returns `202` (looks like it accepted the request) but the task then fails
  with a Postgres "duplicate key value violates unique constraint" error. VERIFIED live: caught by
  the e2e suite re-running against a persistent dev Pulp instance, where a fixture collection had
  already been deprecated by an earlier run. Since there's also no un-deprecate action, Pulpit
  doesn't pre-check this - the failed-task error message is the only signal.
- **A distribution with no repository attached 403s on Galaxy namespace listing**: VERIFIED live -
  `GET .../galaxy/default/api/v3/plugin/ansible/content/<base_path>/namespaces/` for a distribution
  whose `repository` field is `null` returns `403 permission_denied`, even for a superuser, rather
  than an empty list or a clearer error. This is a real, reachable state (a distribution's
  `repository` field gets nulled out if its repository is deleted while the distribution itself
  survives), caught via leftover distributions in the dev environment from an earlier session's
  e2e runs. Pulpit's Namespaces page (`NamespacesPage.tsx`) filters such distributions out of its
  picker entirely rather than surfacing this misleading permission error after the fact.
- **Signatures/marks/deprecations are read-only content endpoints**:
  `content/ansible/collection_signatures/`, `collection_marks/`, and `collection_deprecations/`
  only support `GET` (plus `POST` for deprecations) - signatures and marks are created
  exclusively via a repository's `sign/`/`mark/`/`unmark/` actions, never posted to these
  endpoints directly. Deprecation has no `DELETE` (no un-deprecate). A rules-compliance audit
  against RPM's conventions found these three adapters had been built but never wired into any
  page - the Overview tab's Signatures/Marks rows and the Collections page's Deprecate action
  fixed that.

## Container endpoints (VERIFIED against pulpcore 3.116.0 / pulp_container 2.29.0)

VERIFIED against a live instance: a real remote pointed at `ghcr.io/pulp/hello-world` (a tiny,
~1.84kB fixture image pulp_container's own project maintains for exactly this kind of testing),
synced, browsed (tags/manifests), distributed, and pulled with a real `podman pull` that produced
the exact expected image digest (Milestone 3).

- Repositories (`repositories/container/container/`): same shape as RPM's - `name`/`description`/
  `remote`/`retain_repo_versions`, create is synchronous (`201`), update/delete are asynchronous
  (`202`+task). **No publication concept at all** (like Ansible, unlike RPM) - a distribution
  serves the repository/repository version directly.
- A _second_, distinct repository flavor exists - `repositories/container/container-push/`,
  auto-created by a real `docker/podman push` (or directly via its own CRUD endpoints). Out of
  this milestone's scope (the roadmap's "Repositories"/"Registry UX" items are about the sync-and-
  pull flow, not push) - not built here.
- Remotes (`remotes/container/container/`): the one field genuinely new versus RPM/Ansible is
  `upstream_name` (**required**) - the actual image name on the remote registry (e.g.
  `library/busybox`), separate from Pulpit's own `name` for the remote object. `url` is the
  registry's base URL (e.g. `https://ghcr.io`), not a path to a specific image.
  - **`include_tags`/`exclude_tags` are write-only legacy aliases, not the real field names**:
    VERIFIED live - POSTing `include_tags: ["latest"]` is accepted, but the response never echoes
    it back under that name (it shows up in `hidden_fields`, always `is_set: false`); the value
    instead appears under `includes`. `includes`/`excludes` are the real, current field names for
    both reading and writing glob-pattern tag filters.
  - Filtering sync to specific tags via `includes` isn't just a convenience - VERIFIED live that
    Docker Hub's anonymous pull rate limit (`429 Too Many Requests`) made an unfiltered sync of a
    real multi-tag image (`library/busybox`, 219 manifests) fail entirely; `ghcr.io` didn't hit
    this limit for the small fixture image used instead.
- Distributions (`distributions/container/container/`): create is **asynchronous** (`202`+task,
  like Ansible, unlike RPM's synchronous create). The response's `registry_path` field is the
  actual `<registry>/<base_path>` pull address - Pulpit builds its copyable
  `podman pull <registry_path>` snippet directly from it, the same idea as Ansible's `client_url`
  snippet.
  - **Deleting a distribution also deletes its repository - VERIFIED live, a real, one-directional
    cascade specific to pulp_container.** A `DELETE` on a container distribution reserves _both_
    `container.containerdistribution` and `container.containerrepository` in the same task
    (confirmed via the task's `reserved_resources_record`), and the repository is genuinely gone
    afterward (`404` on a subsequent `GET`). The reverse is not true: deleting the repository
    directly leaves the distribution behind with `repository: null`, which is exactly how a
    distribution ends up in the repository-less state the Ansible `Namespaces` picker filtering
    above guards against for a different plugin. Unlike RPM/Ansible (where a distribution is a
    thin pointer with no ownership over its repository), Pulpit's confirm dialog
    (`RepositoryDistributionsTab.tsx`) now explicitly warns about this consequence via
    `ConfirmDeleteModal`'s new optional `warning` prop, and the delete mutation also invalidates
    the repositories list, not just distributions.
- Content browsing: `content/container/tags/` and `content/container/manifests/`, both filterable
  by `repository_version` like every other content-type list in this app. A `Tag`'s
  `tagged_manifest` field is an href to the manifest content unit (the same "foreign key as href"
  pattern as Ansible's `signed_collection`/`marked_collection`), not a digest string - Pulpit
  doesn't resolve/join it in the Tags table, consistent with how RPM/Ansible tables show only a
  content unit's own fields, not joined foreign ones. A `Manifest`'s own fields
  (`digest`/`media_type`/`architecture`/`os`/`compressed_image_size`) need no such join.
  `content_summary.present` keys for repository versions are `container.tag`/`container.manifest`
  (VERIFIED live, Django's usual `app_label.model_name` convention, same as RPM's `rpm.package`).
- Tagging/untagging (`{repository}tag/`, `{repository}untag/`) and copying content
  (`{repository}copy_tags/`, `{repository}copy_manifests/`) are all asynchronous (`202`+task).
  **Copying is split into two separate actions**, unlike RPM's single `rpm/copy/` or Ansible's
  single `ansible/copy/` - Pulpit's "Copy to…" action fires both (with no name/digest filters, so
  "everything" from the source version) and tracks them as two separate tasks, the closest
  equivalent to RPM/Ansible's whole-version copy simplification.
- **Registry authentication and the nginx routes it needs are covered in `docs/DEPLOYMENT.md`**
  ("Container registry authentication: `TOKEN_AUTH_DISABLED`") rather than duplicated here.

## Access endpoints (VERIFIED against pulpcore 3.116.0)

Pulpcore-core (not plugin-specific), and the one domain in this app where **every mutation is
synchronous** - VERIFIED live: users, groups, roles, role assignments, and group membership all
return 200/201/204 directly, never a task.

- `users/`, `groups/`, `roles/`: standard CRUD. `User.password` and `Role`'s built-in-vs-custom
  `locked` flag are the only fields worth calling out - `locked` roles reject both PATCH and
  DELETE with `403 "The role is locked."` (VERIFIED live). **`is_superuser` is not exposed by the
  API** in any form (not readable, writable, or filterable) - it only appears inside the
  `ordering` query parameter's auto-generated enum description, a drf-spectacular artifact, not a
  real usable field. True superuser status is server-side-only.
- `{user}roles/` / `{group}roles/`: assigns a Role to a user/group, either globally
  (`content_object: null`) or scoped to one object (`content_object` = that object's href).
  **VERIFIED live gotcha**: POSTing without `content_object` at all is a `400` ("Either
  'content_object' or 'content_object_prn' needs to be specified") - omitting it (rather than
  sending `null`) is not the same as "global", it's a validation error.
- **The `role` field is the role's _name_ (e.g. `"rpm.rpmrepository_viewer"`), not its href** -
  VERIFIED live by testing both ways. This is the one place in the entire Pulp API surface this
  app has touched where a cross-reference field is a name string instead of an href; everywhere
  else (RPM/Ansible/Container remotes/repositories/distributions) uses hrefs exclusively. Do not
  assume consistency with the rest of the API here.
- `{group}users/`: adds/removes group members. **VERIFIED live gotcha**: the add-member response's
  own `pulp_href` is the _user's_ href (e.g. `/pulp/api/v3/users/1/`), not a separate
  membership-specific resource, and removal is addressed by `{group}users/{that numeric id}/` -
  not by username, despite the add request itself taking a `username` string.
- Every RBAC-protected object across every plugin (repositories, remotes, distributions, content
  guards...) exposes the same generic `add_role/`, `remove_role/`, `list_roles/`, and
  `my_permissions/` actions (VERIFIED live schema: identical request/response shape everywhere,
  not plugin-specific). These are a convenience layer over the exact same UserRole/GroupRole
  records `{user}roles/`/`{group}roles/` manage - granting access one way is visible the other way
  too, confirmed by a live round-trip.
- **VERIFIED live, worth calling out explicitly**: Pulp automatically grants the _creator_ of an
  object an "owner" role on it as a side effect of creation - a freshly created repository's
  `list_roles/` is never actually empty, only empty of everyone _except_ its creator. Don't
  mistake this for a bug when an "empty" access list unexpectedly shows one row.

## Administration endpoints (VERIFIED against pulpcore 3.116.0 / pulp_certguard 1.8.0)

- `signing-services/` is **read-only** - VERIFIED live schema: `GET` only, no `POST`/`PUT`/
  `PATCH`/`DELETE`. Setting one up requires a signing script and a Django management command run
  on the Pulp server itself; there is nothing to create/edit through the API.
- Content guards have a **generic** list endpoint, `contentguards/` (`GET` only), that returns
  every flavor uniformly but with only base fields - `pulp_href`/`prn`/`name`/`description`, no
  `type`. **The flavor has to be read out of `prn`** (e.g.
  `prn:core.headercontentguard:<uuid>`) - there is no other way to distinguish flavors from the
  generic list. Six separate flavor-specific resources exist for actual CRUD, all synchronous
  (200/201/204, never a task):
  - `contentguards/core/header/` - `header_name`, `header_value`, `jq_filter` (optional).
  - `contentguards/core/rbac/` - no extra fields; access is managed entirely through the generic
    per-object `add_role`/`remove_role`/`list_roles` actions (see "Access endpoints", above) -
    **VERIFIED live**, granting a role to an RBAC guard shows up in its `list_roles/` exactly like
    a repository. Creating one also auto-grants the creator both `*_owner` and `*_downloader`
    roles, the same auto-owner-role behavior as repositories.
  - `contentguards/core/content_redirect/` - no extra fields; Pulp's own internal mechanism behind
    signed content URLs, auto-created per-domain rather than typically hand-created.
  - `contentguards/core/composite/` - `guards`: array of other guards' hrefs (any flavor).
  - `contentguards/certguard/x509/` and `contentguards/certguard/rhsm/` - both take
    `ca_certificate` (a PEM string); otherwise identical shape, `rhsm` validates the way
    subscription-manager does.
  - **DELETE works via any guard's own specific-flavor href regardless of which flavor it is** -
    the href itself already encodes the correct path, so a generic delete-by-href doesn't need to
    know the flavor first.
- LDAP: Pulp itself exposes no REST API surface for it, but `pulpit-core` has its own endpoints
  (`pulpit-core/app/modules/ldap/routes/`) that write the underlying `AUTH_LDAP_*`/
  `AUTHENTICATION_BACKENDS` Django settings on the server directly and test a bind against the
  directory, exposed as Administration → LDAP (see `docs/AUTHENTICATION.md`).
- Reverse-proxy SSO: **no REST API surface at all** - `REMOTE_USER_ENVIRON_NAME` exists but is
  configured via raw Django settings on the server (`AUTHENTICATION_BACKENDS`), with no
  dynaconf/`PULP_*` env-var wiring - unlike SAML, which pulpcore auto-wires from a `SAML_CONFIG`
  setting via its own `saml2_settings_hook`. Nothing for this app to call. LDAP group mirroring
  populates Django's standard `Group` model, so mirrored groups appear in the existing Groups UI
  automatically.

## Error model

Pulpit normalizes Pulp API errors (`src/api/errors/`) into a small set of distinguishable cases
so the UI can react consistently:

| Case                | Typical signal                                |
| ------------------- | --------------------------------------------- |
| Unauthenticated     | `401`                                         |
| Forbidden           | `403`                                         |
| Not found           | `404`                                         |
| Validation error    | `400` with field-level detail                 |
| Conflict            | `409` (or a domain-specific conflict payload) |
| Backend unavailable | `502`/`503`/network failure                   |
| Task failure        | Task object with `state: "failed"`            |

The UI shows a concise, human message per case, with a "technical details" expansion (raw
status/body) available for administrators — never a raw JSON dump as the primary presentation,
and never a silently swallowed error. See `docs/UX.md` for the notification conventions and
`docs/SECURITY.md` for what technical detail is safe to show.

## Version compatibility approach

Pulpit targets whatever pulpcore/plugin versions the live instance reports (see status
discovery, above) rather than hardcoding one version. Where a feature depends on
version-specific API behavior, that dependency should be checked against the live
`/pulp/api/v3/status/` response and noted in code/comments and here, not assumed from the
bootstrap reference versions.

Two concrete pieces of this (docs/ROADMAP.md "API/version-compatibility handling"), both driven
by the same `status.versions` list:

- `src/api/capabilities.ts`'s `deriveCapabilities` turns the reported component list into
  `{rpm, container, ansible}` booleans; `AppNav` hides a plugin's entire nav group when its
  capability is false, so a deployment missing a plugin never shows navigation to pages that
  would just 404 - failing open (every group shown) while status is loading or unavailable.
- `src/lib/pulpCompatibility.ts` compares each reported component's version (major.minor) against
  the version Pulpit's own milestones were last VERIFIED against, surfaced as a "Compatibility"
  column on the Overview page. A static, hand-maintained baseline - there's no live
  compatibility-matrix endpoint to fetch instead.

### VERIFIED — caller-authorized signing and browser size queries (2026-09-08)

Live instance: pulpcore 3.116.1, pulp_rpm 3.38.5. The RPM schema exposes
`{rpm_rpm_repository_href}my_permissions/`, but the live admin response was
`{"permissions": []}`. Do not infer that an empty list forbids a superuser's actions.
Repository signing now sends its GET/PATCH with the caller's credentials and leaves
permission enforcement to Pulp; the returned task is followed by a core job.

The generic `/repositories/?fields=pulp_href,latest_version_href`,
`/content/?fields=pulp_href,artifacts` and `/artifacts/?fields=pulp_href,size`
queries return paginated JSON (200), verified live. `next` may contain the public
absolute origin. Browser size calculations paginate using locally constructed
limit/offset parameters, never forward credentials to a `next` hostname. Repository
sizes use the existing `repository_version` content filter. No privileged backend
cache is involved.

VERIFIED during the same Compose validation: a freshly created non-staff user
can authenticate through `/login/` but receives 403 on their own `/users/{id}/`
record. Core staff checks therefore propagate a forbidden result, not 401/logout.

VERIFIED follow-up: the live RPM repository PATCH used to clear signing fields
returned 200 with the repository object, not a task. Core now handles both this
synchronous response (JobRead already marked success) and a task response (queued
polling job). Never infer asynchronous behavior solely from the PATCH method or
from earlier plugin versions.
