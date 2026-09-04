import { http, HttpResponse } from "msw";

import type {
  RpmAdvisory,
  RpmAlternateContentSource,
  RpmDistribution,
  RpmPackage,
  RpmPackageCategory,
  RpmPackageEnvironment,
  RpmPackageGroup,
  RpmPackageLangpacks,
  RpmDistributionTree,
  RpmModulemd,
  RpmModulemdDefaults,
  RpmModulemdObsolete,
  RpmRepoMetadataFile,
  RpmRemote,
  RpmRemoteCreate,
  RpmRemoteUpdate,
  RpmRepository,
  RpmUlnRemote,
} from "../api/client/rpm/types";
import type {
  AnsibleDistribution,
  AnsibleRepository,
  AnsibleRole,
  CollectionRemote,
  CollectionVersion,
} from "../api/client/ansible/types";
import type {
  Group,
  GroupUser,
  Role,
  RoleAssignment,
  User,
} from "../api/client/access/types";
import type { SigningService } from "../api/client/administration/types";
import type { PulpTask } from "../api/client/tasks";
import type {
  ContainerDistribution,
  ContainerManifest,
  ContainerRemote,
  ContainerRepository,
  ContainerTag,
} from "../api/client/container/types";

// VERIFIED: trimmed down from an actual /pulp/api/v3/status/ response
// captured against pulpcore 3.116.0 in the bootstrap dev Compose stack
// (docs/PULP_API.md). Only the fields Pulpit's UI actually reads are kept.
export const PULP_STATUS_FIXTURE = {
  versions: [
    { component: "core", version: "3.116.0", package: "pulpcore" },
    { component: "rpm", version: "3.38.5", package: "pulp-rpm" },
    { component: "container", version: "2.29.0", package: "pulp-container" },
    { component: "ansible", version: "0.30.0", package: "pulp-ansible" },
  ],
  online_workers: [{}, {}],
  online_api_apps: [{}, {}],
  online_content_apps: [{}, {}],
  database_connection: { connected: true },
  redis_connection: { connected: false },
  storage: { total: 1021431513088, used: 66708217856, free: 954255859712 },
};

// VERIFIED: matches the real /pulp/api/v3/login/ contract captured against
// the bootstrap dev instance (docs/AUTHENTICATION.md) - POST authenticates
// via the Authorization header (not a body), 401 with {detail: "..."} on
// bad credentials.
//
// jsdom's fetch/cookie handling can't faithfully round-trip a real
// Set-Cookie -> subsequent-request-Cookie session the way a browser does,
// so these default handlers model "no session" (GET -> 401) rather than
// trying to simulate cookie state; tests that need an authenticated GET
// override it explicitly with server.use(...).
export const TEST_USER = {
  pulp_href: "/pulp/api/v3/users/1/",
  prn: "prn:auth.user:1",
  username: "admin",
};
const TEST_CREDENTIALS = `Basic ${btoa("admin:correct-password")}`;

const authHandlers = [
  http.get("/pulp/api/v3/status/", () => HttpResponse.json(PULP_STATUS_FIXTURE)),

  http.get("/pulp/api/v3/login/", () =>
    HttpResponse.json(
      { detail: "Authentication credentials were not provided." },
      { status: 401 },
    ),
  ),

  http.post("/pulp/api/v3/login/", ({ request }) => {
    if (request.headers.get("Authorization") === TEST_CREDENTIALS) {
      return HttpResponse.json(TEST_USER, { status: 201 });
    }
    return HttpResponse.json({ detail: "Invalid username/password." }, { status: 401 });
  }),

  http.delete("/pulp/api/v3/login/", () => new HttpResponse(null, { status: 204 })),
];

// ---------------------------------------------------------------------------
// RPM fixtures - shapes VERIFIED against the live OpenAPI schema of a
// pulpcore 3.116.0 / pulp_rpm 3.38.5 instance (docs/PULP_API.md, the
// pulp-api skill), captured this session while building the RPM feature
// set. Each collection is a small mutable in-memory store so component
// tests can exercise real create/sync/delete -> list-refresh flows;
// resetRpmFixtures() restores the initial seed data between tests.
const REPO_BASE = "/pulp/api/v3/repositories/rpm/rpm/";
const REMOTE_BASE = "/pulp/api/v3/remotes/rpm/rpm/";
const ULN_REMOTE_BASE = "/pulp/api/v3/remotes/rpm/uln/";
const DIST_BASE = "/pulp/api/v3/distributions/rpm/rpm/";
const PACKAGES_BASE = "/pulp/api/v3/content/rpm/packages/";
const ADVISORIES_BASE = "/pulp/api/v3/content/rpm/advisories/";
const PUBLICATIONS_BASE = "/pulp/api/v3/publications/rpm/rpm/";
const TASKS_BASE = "/pulp/api/v3/tasks/";
const GROUPS_BASE = "/pulp/api/v3/content/rpm/packagegroups/";
const CATEGORIES_BASE = "/pulp/api/v3/content/rpm/packagecategories/";
const ENVIRONMENTS_BASE = "/pulp/api/v3/content/rpm/packageenvironments/";
const LANGPACKS_BASE = "/pulp/api/v3/content/rpm/packagelangpacks/";
const MODULEMDS_BASE = "/pulp/api/v3/content/rpm/modulemds/";
const MODULEMD_DEFAULTS_BASE = "/pulp/api/v3/content/rpm/modulemd_defaults/";
const MODULEMD_OBSOLETES_BASE = "/pulp/api/v3/content/rpm/modulemd_obsoletes/";
const DISTRIBUTION_TREES_BASE = "/pulp/api/v3/content/rpm/distribution_trees/";
const REPO_METADATA_FILES_BASE = "/pulp/api/v3/content/rpm/repo_metadata_files/";
const COMPS_UPLOAD_BASE = "/pulp/api/v3/rpm/comps/";
const ACS_BASE = "/pulp/api/v3/acs/rpm/rpm/";
const PRUNE_BASE = "/pulp/api/v3/rpm/prune/";
const COPY_BASE = "/pulp/api/v3/rpm/copy/";
const TASK_GROUPS_BASE = "/pulp/api/v3/task-groups/";

let nextId = 1;
function freshId(): string {
  return `01900000-0000-7000-8000-${String(nextId++).padStart(12, "0")}`;
}

export const RPM_REMOTE_FIXTURE: RpmRemote = {
  pulp_href: `${REMOTE_BASE}remote-1/`,
  name: "test-fixture",
  url: "https://fixtures.pulpproject.org/rpm-unsigned/",
  policy: "immediate",
  pulp_created: "2026-08-20T10:00:00.000000Z",
  proxy_url: null,
  tls_validation: true,
  ca_cert: null,
  hidden_fields: [
    { name: "proxy_username", is_set: false },
    { name: "proxy_password", is_set: false },
    { name: "username", is_set: false },
    { name: "password", is_set: false },
  ],
};

export const RPM_REPO_FIXTURE = {
  pulp_href: `${REPO_BASE}repo-1/`,
  name: "test-repo",
  description: "A test repository",
  remote: RPM_REMOTE_FIXTURE.pulp_href,
  autopublish: false,
  versions_href: `${REPO_BASE}repo-1/versions/`,
  latest_version_href: `${REPO_BASE}repo-1/versions/1/`,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

export const RPM_VERSION_FIXTURES = [
  {
    pulp_href: `${REPO_BASE}repo-1/versions/1/`,
    number: 1,
    repository: RPM_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:05:00.000000Z",
    content_summary: {
      added: { "rpm.package": { count: 35, href: `${REPO_BASE}repo-1/versions/1/` } },
      removed: {},
      present: { "rpm.package": { count: 35, href: `${REPO_BASE}repo-1/versions/1/` } },
    },
  },
  {
    pulp_href: `${REPO_BASE}repo-1/versions/0/`,
    number: 0,
    repository: RPM_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:00:00.000000Z",
    content_summary: { added: {}, removed: {}, present: {} },
  },
];

export const RPM_PACKAGE_FIXTURE = {
  pulp_href: `${PACKAGES_BASE}pkg-1/`,
  name: "walrus",
  epoch: "0",
  version: "5.21",
  release: "1",
  arch: "noarch",
  checksum_type: "sha256",
  sha256: "abc123",
  size_package: 1853,
  location_href: "walrus-5.21-1.noarch.rpm",
};

export const RPM_ADVISORY_FIXTURE: RpmAdvisory = {
  pulp_href: `${ADVISORIES_BASE}advisory-1/`,
  id: "RHBA-2026:0001",
  title: "walrus bugfix update",
  type: "bugfix",
  severity: "",
  description: "An update to walrus that fixes several bugs.",
  issued_date: "2026-08-20 10:00:00",
  updated_date: "2026-08-20 10:00:00",
  reboot_suggested: false,
  references: [],
};

export const RPM_ACS_FIXTURE: RpmAlternateContentSource = {
  pulp_href: `${ACS_BASE}acs-1/`,
  name: "test-acs",
  last_refreshed: null,
  paths: [],
  remote: RPM_REMOTE_FIXTURE.pulp_href,
};

// Static, read-only content types (sync-derived only - see
// RepositoryContentTab.tsx) - one representative sample each, matching real
// data captured from a live `fixtures.pulpproject.org/rpm-unsigned/` sync
// for the comps-derived ones (groups/categories/langpacks); modulemd*/
// distribution trees/repo metadata files have no synced sample in this
// dev instance, so those three are shaped from the live schema only.
export const RPM_PACKAGE_GROUP_FIXTURE: RpmPackageGroup = {
  pulp_href: `${GROUPS_BASE}group-1/`,
  id: "birds",
  name: "birds",
  description: "",
  default: true,
  user_visible: true,
  packages: [
    { name: "cockateel", type: 3 },
    { name: "duck", type: 3 },
    { name: "penguin", type: 3 },
    { name: "stork", type: 3 },
  ],
};

export const RPM_PACKAGE_CATEGORY_FIXTURE: RpmPackageCategory = {
  pulp_href: `${CATEGORIES_BASE}category-1/`,
  id: "all",
  name: "all",
  description: "",
  group_ids: [
    { name: "mammals", default: false },
    { name: "birds", default: false },
  ],
};

export const RPM_PACKAGE_ENVIRONMENT_FIXTURE: RpmPackageEnvironment = {
  pulp_href: `${ENVIRONMENTS_BASE}environment-1/`,
  id: "minimal",
  name: "Minimal Install",
  description: "",
  group_ids: [{ name: "core", default: false }],
  option_ids: [],
};

export const RPM_PACKAGE_LANGPACKS_FIXTURE: RpmPackageLangpacks = {
  pulp_href: `${LANGPACKS_BASE}langpacks-1/`,
  matches: { "gorilla-en": "gorilla-%s", "zebra-docs": "zebra-%s" },
};

export const RPM_MODULEMD_FIXTURE: RpmModulemd = {
  pulp_href: `${MODULEMDS_BASE}modulemd-1/`,
  name: "postgresql",
  stream: "12",
  version: "1",
  context: "abcd1234",
  arch: "x86_64",
  description: "PostgreSQL module",
};

export const RPM_MODULEMD_DEFAULTS_FIXTURE: RpmModulemdDefaults = {
  pulp_href: `${MODULEMD_DEFAULTS_BASE}defaults-1/`,
  module: "postgresql",
  stream: "12",
};

export const RPM_MODULEMD_OBSOLETE_FIXTURE: RpmModulemdObsolete = {
  pulp_href: `${MODULEMD_OBSOLETES_BASE}obsolete-1/`,
  module_name: "postgresql",
  module_stream: "12",
  message: "postgresql:12 is deprecated, switch to postgresql:14",
  obsoleted_by_module_name: "postgresql",
  obsoleted_by_module_stream: "14",
};

export const RPM_DISTRIBUTION_TREE_FIXTURE: RpmDistributionTree = {
  pulp_href: `${DISTRIBUTION_TREES_BASE}tree-1/`,
  release_name: "Test Distribution",
  release_short: "TD",
  release_version: "9",
  arch: "x86_64",
};

export const RPM_REPO_METADATA_FILE_FIXTURE: RpmRepoMetadataFile = {
  pulp_href: `${REPO_METADATA_FILES_BASE}metadata-1/`,
  data_type: "productid",
  relative_path: "repodata/productid",
  checksum_type: "sha256",
};

export const RPM_DISTRIBUTION_FIXTURE = {
  pulp_href: `${DIST_BASE}dist-1/`,
  name: "existing-dist",
  base_path: "existing-dist-path",
  base_url: "https://pulp.example.com/pulp/content/existing-dist-path/",
  repository: RPM_REPO_FIXTURE.pulp_href,
  publication: null,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

function seedRepositories(): RpmRepository[] {
  return [{ ...RPM_REPO_FIXTURE }];
}
function seedRemotes(): RpmRemote[] {
  return [{ ...RPM_REMOTE_FIXTURE }];
}
function seedUlnRemotes(): RpmUlnRemote[] {
  return [];
}
function seedDistributions(): RpmDistribution[] {
  return [{ ...RPM_DISTRIBUTION_FIXTURE }];
}
function seedPackages(): RpmPackage[] {
  return [{ ...RPM_PACKAGE_FIXTURE }];
}
function seedAdvisories(): RpmAdvisory[] {
  return [{ ...RPM_ADVISORY_FIXTURE }];
}
function seedAcs(): RpmAlternateContentSource[] {
  return [{ ...RPM_ACS_FIXTURE }];
}
function seedTasks() {
  return new Map<
    string,
    { pulp_href: string; name: string; state: string; finished_at: string | null }
  >();
}

let repositories = seedRepositories();
let remotes = seedRemotes();
let ulnRemotes = seedUlnRemotes();
let distributions = seedDistributions();
let packages = seedPackages();
let advisories = seedAdvisories();
let acs = seedAcs();
let tasks = seedTasks();

/** Restores every RPM in-memory fixture store to its initial seed - call from `afterEach`. */
export function resetRpmFixtures() {
  nextId = 1;
  repositories = seedRepositories();
  remotes = seedRemotes();
  ulnRemotes = seedUlnRemotes();
  distributions = seedDistributions();
  packages = seedPackages();
  advisories = seedAdvisories();
  acs = seedAcs();
  tasks = seedTasks();
}

function registerTask(name: string): string {
  const href = `${TASKS_BASE}${freshId()}/`;
  tasks.set(href, {
    pulp_href: href,
    name,
    state: "completed",
    finished_at: "2026-08-20T10:00:01.000000Z",
  });
  return href;
}

const rpmHandlers = [
  // Repositories
  http.get(REPO_BASE, ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const results = name ? repositories.filter((r) => r.name === name) : repositories;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(REPO_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      remote?: string;
      autopublish?: boolean;
    };
    const id = freshId();
    const repo = {
      pulp_href: `${REPO_BASE}${id}/`,
      name: body.name,
      description: body.description ?? null,
      remote: body.remote ?? null,
      autopublish: body.autopublish ?? false,
      versions_href: `${REPO_BASE}${id}/versions/`,
      latest_version_href: `${REPO_BASE}${id}/versions/0/`,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    repositories = [...repositories, repo];
    return HttpResponse.json(repo, { status: 201 });
  }),
  http.get(`${REPO_BASE}:id/`, ({ params }) => {
    const href = `${REPO_BASE}${params.id}/`;
    const repo = repositories.find((r) => r.pulp_href === href);
    if (!repo) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(repo);
  }),
  http.delete(`${REPO_BASE}:id/`, ({ params }) => {
    const href = `${REPO_BASE}${params.id}/`;
    repositories = repositories.filter((r) => r.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask(`Delete repository`) },
      { status: 202 },
    );
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${REPO_BASE}:id/`, async ({ params, request }) => {
    const href = `${REPO_BASE}${params.id}/`;
    const body = (await request.json()) as Partial<RpmRepository>;
    repositories = repositories.map((r) =>
      r.pulp_href === href ? { ...r, ...body } : r,
    );
    return HttpResponse.json(
      { task: registerTask("Update repository") },
      { status: 202 },
    );
  }),
  http.post(`${REPO_BASE}:id/sync/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Sync repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.post(`${REPO_BASE}:id/modify/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Modify repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.get(`${REPO_BASE}:id/versions/`, ({ params }) => {
    const results = RPM_VERSION_FIXTURES.filter(
      (v) => v.repository === `${REPO_BASE}${params.id}/`,
    );
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.delete(`${REPO_BASE}:id/versions/:number/`, () =>
    HttpResponse.json(
      { task: registerTask("Delete repository version") },
      { status: 202 },
    ),
  ),

  // Remotes
  http.get(REMOTE_BASE, () =>
    HttpResponse.json({
      count: remotes.length,
      next: null,
      previous: null,
      results: remotes,
    }),
  ),
  http.post(REMOTE_BASE, async ({ request }) => {
    const body = (await request.json()) as RpmRemoteCreate;
    const remote: RpmRemote = {
      pulp_href: `${REMOTE_BASE}${freshId()}/`,
      name: body.name,
      url: body.url,
      policy: body.policy ?? "immediate",
      pulp_created: "2026-08-20T11:00:00.000000Z",
      proxy_url: body.proxy_url ?? null,
      tls_validation: body.tls_validation ?? true,
      ca_cert: body.ca_cert ?? null,
      hidden_fields: [
        { name: "proxy_username", is_set: Boolean(body.proxy_username) },
        { name: "proxy_password", is_set: Boolean(body.proxy_password) },
        { name: "username", is_set: Boolean(body.username) },
        { name: "password", is_set: Boolean(body.password) },
      ],
    };
    remotes = [...remotes, remote];
    return HttpResponse.json(remote, { status: 201 });
  }),
  http.delete(`${REMOTE_BASE}:id/`, ({ params }) => {
    const href = `${REMOTE_BASE}${params.id}/`;
    remotes = remotes.filter((r) => r.pulp_href !== href);
    return HttpResponse.json({ task: registerTask("Delete remote") }, { status: 202 });
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${REMOTE_BASE}:id/`, async ({ params, request }) => {
    const href = `${REMOTE_BASE}${params.id}/`;
    const body = (await request.json()) as RpmRemoteUpdate;
    remotes = remotes.map((r) => {
      if (r.pulp_href !== href) {
        return r;
      }
      const hiddenFields = r.hidden_fields.map((f) =>
        f.name in body && body[f.name as keyof RpmRemoteUpdate]
          ? { ...f, is_set: true }
          : f,
      );
      return {
        ...r,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.url !== undefined ? { url: body.url } : {}),
        ...(body.policy !== undefined ? { policy: body.policy } : {}),
        ...(body.proxy_url !== undefined ? { proxy_url: body.proxy_url } : {}),
        ...(body.tls_validation !== undefined
          ? { tls_validation: body.tls_validation }
          : {}),
        ...(body.ca_cert !== undefined ? { ca_cert: body.ca_cert } : {}),
        hidden_fields: hiddenFields,
      };
    });
    return HttpResponse.json({ task: registerTask("Update remote") }, { status: 202 });
  }),

  // ULN remotes - a second, separate remote collection (VERIFIED live).
  http.get(ULN_REMOTE_BASE, () =>
    HttpResponse.json({
      count: ulnRemotes.length,
      next: null,
      previous: null,
      results: ulnRemotes,
    }),
  ),
  http.post(ULN_REMOTE_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      url: string;
      uln_server_base_url: string;
      username?: string;
      password?: string;
      policy?: RpmUlnRemote["policy"];
    };
    if (!body.username || !body.password) {
      return HttpResponse.json(
        {
          ...(body.username ? {} : { username: ["This field is required."] }),
          ...(body.password ? {} : { password: ["This field is required."] }),
        },
        { status: 400 },
      );
    }
    const remote: RpmUlnRemote = {
      pulp_href: `${ULN_REMOTE_BASE}${freshId()}/`,
      name: body.name,
      url: body.url,
      uln_server_base_url: body.uln_server_base_url,
      policy: body.policy ?? "immediate",
      pulp_created: "2026-08-20T11:00:00.000000Z",
      proxy_url: null,
      tls_validation: true,
      hidden_fields: [
        { name: "proxy_username", is_set: false },
        { name: "proxy_password", is_set: false },
        { name: "username", is_set: true },
        { name: "password", is_set: true },
      ],
    };
    ulnRemotes = [...ulnRemotes, remote];
    return HttpResponse.json(remote, { status: 201 });
  }),
  http.delete(`${ULN_REMOTE_BASE}:id/`, ({ params }) => {
    const href = `${ULN_REMOTE_BASE}${params.id}/`;
    ulnRemotes = ulnRemotes.filter((r) => r.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete ULN remote") },
      { status: 202 },
    );
  }),

  // Distributions
  http.get(DIST_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repository = url.searchParams.get("repository");
    const results = repository
      ? distributions.filter((d) => d.repository === repository)
      : distributions;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(DIST_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      base_path: string;
      repository?: string;
    };
    const id = freshId();
    const distribution = {
      pulp_href: `${DIST_BASE}${id}/`,
      name: body.name,
      base_path: body.base_path,
      base_url: `https://pulp.example.com/pulp/content/${body.base_path}/`,
      repository: body.repository ?? null,
      publication: null,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    const task = registerTask(`Create distribution "${body.name}"`);
    distributions = [...distributions, distribution];
    return HttpResponse.json({ task }, { status: 202 });
  }),
  http.delete(`${DIST_BASE}:id/`, ({ params }) => {
    const href = `${DIST_BASE}${params.id}/`;
    distributions = distributions.filter((d) => d.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete distribution") },
      { status: 202 },
    );
  }),

  // Packages
  http.get(PACKAGES_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repositoryVersion = url.searchParams.get("repository_version");
    const results = repositoryVersion ? [] : packages;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),

  // Advisories
  http.get(ADVISORIES_BASE, () =>
    HttpResponse.json({
      count: advisories.length,
      next: null,
      previous: null,
      results: advisories,
    }),
  ),
  http.post(ADVISORIES_BASE, async ({ request }) => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return HttpResponse.json({ detail: "expected multipart upload" }, { status: 400 });
    }
    const advisory = {
      ...RPM_ADVISORY_FIXTURE,
      pulp_href: `${ADVISORIES_BASE}${freshId()}/`,
    };
    advisories = [...advisories, advisory];
    return HttpResponse.json({ task: registerTask("Upload advisory") }, { status: 202 });
  }),

  // Read-only, sync-derived content types - static single-item pages.
  http.get(GROUPS_BASE, () =>
    HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [RPM_PACKAGE_GROUP_FIXTURE],
    }),
  ),
  http.get(CATEGORIES_BASE, () =>
    HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [RPM_PACKAGE_CATEGORY_FIXTURE],
    }),
  ),
  http.get(ENVIRONMENTS_BASE, () =>
    HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [RPM_PACKAGE_ENVIRONMENT_FIXTURE],
    }),
  ),
  http.get(LANGPACKS_BASE, () =>
    HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [RPM_PACKAGE_LANGPACKS_FIXTURE],
    }),
  ),
  http.get(MODULEMDS_BASE, () =>
    HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [RPM_MODULEMD_FIXTURE],
    }),
  ),
  http.get(MODULEMD_DEFAULTS_BASE, () =>
    HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [RPM_MODULEMD_DEFAULTS_FIXTURE],
    }),
  ),
  http.get(MODULEMD_OBSOLETES_BASE, () =>
    HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [RPM_MODULEMD_OBSOLETE_FIXTURE],
    }),
  ),
  http.get(DISTRIBUTION_TREES_BASE, () =>
    HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [RPM_DISTRIBUTION_TREE_FIXTURE],
    }),
  ),
  http.get(REPO_METADATA_FILES_BASE, () =>
    HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [RPM_REPO_METADATA_FILE_FIXTURE],
    }),
  ),
  http.post(COMPS_UPLOAD_BASE, async ({ request }) => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return HttpResponse.json({ detail: "expected multipart upload" }, { status: 400 });
    }
    return HttpResponse.json({ task: registerTask("Upload comps.xml") }, { status: 202 });
  }),

  // Alternate Content Sources
  http.get(ACS_BASE, () =>
    HttpResponse.json({ count: acs.length, next: null, previous: null, results: acs }),
  ),
  http.post(ACS_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      remote: string;
      paths?: string[];
    };
    const created: RpmAlternateContentSource = {
      pulp_href: `${ACS_BASE}${freshId()}/`,
      name: body.name,
      remote: body.remote,
      paths: body.paths ?? [],
      last_refreshed: null,
    };
    acs = [...acs, created];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.delete(`${ACS_BASE}:id/`, ({ params }) => {
    const href = `${ACS_BASE}${params.id}/`;
    acs = acs.filter((a) => a.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete alternate content source") },
      { status: 202 },
    );
  }),
  // VERIFIED live: refresh returns {task_group}, not {task} - a distinct
  // response shape from every other RPM mutation (see acs.ts).
  http.post(`${ACS_BASE}:id/refresh/`, () => {
    registerTask("Refresh alternate content source");
    return HttpResponse.json(
      { task_group: `${TASK_GROUPS_BASE}${freshId()}/` },
      { status: 202 },
    );
  }),
  // VERIFIED live: unlike ACS refresh/prune, copy returns a plain {task}.
  http.post(COPY_BASE, () =>
    HttpResponse.json({ task: registerTask("Copy content") }, { status: 202 }),
  ),
  // VERIFIED live: prune also returns {task_group}, not {task}.
  http.post(PRUNE_BASE, async ({ request }) => {
    const body = (await request.json()) as { dry_run?: boolean };
    registerTask(body.dry_run ? "Prune packages (dry run)" : "Prune packages");
    return HttpResponse.json(
      { task_group: `${TASK_GROUPS_BASE}${freshId()}/` },
      { status: 202 },
    );
  }),
  // The mock doesn't model a real task-group <-> task mapping (no store for
  // it) - it just reports whichever task was most recently registered,
  // which is always the refresh/prune task immediately after the relevant
  // POST above.
  http.get(`${TASK_GROUPS_BASE}:id/`, ({ params }) => {
    const [, lastTask] = [...tasks.entries()].at(-1) ?? [];
    return HttpResponse.json({
      pulp_href: `${TASK_GROUPS_BASE}${params.id}/`,
      tasks: lastTask ? [{ pulp_href: lastTask.pulp_href }] : [],
    });
  }),
  http.post(`${PACKAGES_BASE}upload/`, async ({ request }) => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return HttpResponse.json({ detail: "expected multipart upload" }, { status: 400 });
    }
    const pkg = { ...RPM_PACKAGE_FIXTURE, pulp_href: `${PACKAGES_BASE}${freshId()}/` };
    packages = [...packages, pkg];
    return HttpResponse.json(pkg, { status: 201 });
  }),

  // Publications
  http.post(PUBLICATIONS_BASE, () =>
    HttpResponse.json({ task: registerTask("Publish repository") }, { status: 202 }),
  ),

  // Tasks
  http.get(`${TASKS_BASE}:id/`, ({ params }) => {
    const href = `${TASKS_BASE}${params.id}/`;
    const task = tasks.get(href);
    if (!task) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(task);
  }),
];

// ---------------------------------------------------------------------------
// Ansible fixtures - shapes VERIFIED against the live OpenAPI schema of a
// pulpcore 3.116.0 / pulp_ansible 0.30.0 instance (docs/PULP_API.md "Ansible
// endpoints"), mirroring the RPM in-memory mutable store pattern above.

const ANSIBLE_REPO_BASE = "/pulp/api/v3/repositories/ansible/ansible/";
const COLLECTION_REMOTE_BASE = "/pulp/api/v3/remotes/ansible/collection/";
const GIT_REMOTE_BASE = "/pulp/api/v3/remotes/ansible/git/";
const ROLE_REMOTE_BASE = "/pulp/api/v3/remotes/ansible/role/";
const ANSIBLE_DIST_BASE = "/pulp/api/v3/distributions/ansible/ansible/";
const COLLECTION_VERSIONS_BASE = "/pulp/api/v3/content/ansible/collection_versions/";
const ANSIBLE_ROLES_BASE = "/pulp/api/v3/content/ansible/roles/";
const COLLECTION_SIGNATURES_BASE = "/pulp/api/v3/content/ansible/collection_signatures/";
const COLLECTION_MARKS_BASE = "/pulp/api/v3/content/ansible/collection_marks/";
const COLLECTION_DEPRECATIONS_BASE =
  "/pulp/api/v3/content/ansible/collection_deprecations/";
const SIGNING_SERVICES_BASE = "/pulp/api/v3/signing-services/";
const ARTIFACTS_BASE = "/pulp/api/v3/artifacts/";
const ANSIBLE_COPY_BASE = "/pulp/api/v3/ansible/copy/";

export const ANSIBLE_REPO_FIXTURE: AnsibleRepository = {
  pulp_href: `${ANSIBLE_REPO_BASE}ansible-repo-1/`,
  name: "test-ansible-repo",
  description: "A clean test Ansible repository",
  remote: `${COLLECTION_REMOTE_BASE}collection-remote-1/`,
  retain_repo_versions: null,
  gpgkey: null,
  private: false,
  versions_href: `${ANSIBLE_REPO_BASE}ansible-repo-1/versions/`,
  latest_version_href: `${ANSIBLE_REPO_BASE}ansible-repo-1/versions/1/`,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

export const ANSIBLE_VERSION_FIXTURES = [
  {
    pulp_href: `${ANSIBLE_REPO_BASE}ansible-repo-1/versions/1/`,
    number: 1,
    repository: ANSIBLE_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:05:00.000000Z",
    content_summary: {
      added: {},
      removed: {},
      present: {
        "ansible.collection_version": { count: 1, href: "" },
        "ansible.role": { count: 1, href: "" },
      },
    },
  },
  {
    pulp_href: `${ANSIBLE_REPO_BASE}ansible-repo-1/versions/0/`,
    number: 0,
    repository: ANSIBLE_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:00:00.000000Z",
    content_summary: { added: {}, removed: {}, present: {} },
  },
];

export const COLLECTION_REMOTE_FIXTURE: CollectionRemote = {
  pulp_href: `${COLLECTION_REMOTE_BASE}collection-remote-1/`,
  name: "test-collection-remote",
  url: "https://galaxy.ansible.com/api/",
  policy: "immediate",
  pulp_created: "2026-08-20T10:00:00.000000Z",
  proxy_url: null,
  tls_validation: true,
  ca_cert: null,
  hidden_fields: [{ name: "token", is_set: false }],
  requirements_file: null,
  auth_url: null,
  sync_dependencies: false,
  signed_only: false,
  sync_highest_versions: null,
};

export const ANSIBLE_DISTRIBUTION_FIXTURE: AnsibleDistribution = {
  pulp_href: `${ANSIBLE_DIST_BASE}ansible-dist-1/`,
  name: "test-ansible-dist",
  base_path: "test-ansible-dist",
  repository: ANSIBLE_REPO_FIXTURE.pulp_href,
  repository_version: null,
  client_url: "https://pulp.example.com/pulp_ansible/galaxy/test-ansible-dist/",
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

export const COLLECTION_VERSION_FIXTURE: CollectionVersion = {
  pulp_href: `${COLLECTION_VERSIONS_BASE}cv-1/`,
  namespace: "pulpit_test",
  name: "demo",
  version: "1.0.0",
  authors: [],
  description: "A test collection",
  documentation: null,
  homepage: null,
  issues: null,
  license: [],
  tags: [],
  requires_ansible: ">=2.9",
  sha256: null,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

export const ANSIBLE_ROLE_FIXTURE: AnsibleRole = {
  pulp_href: `${ANSIBLE_ROLES_BASE}role-1/`,
  name: "testrole",
  namespace: "pulpit_test",
  version: "1.0.0",
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

function seedAnsibleRepositories(): AnsibleRepository[] {
  return [{ ...ANSIBLE_REPO_FIXTURE }];
}
function seedCollectionRemotes(): CollectionRemote[] {
  return [{ ...COLLECTION_REMOTE_FIXTURE }];
}
function seedAnsibleDistributions(): AnsibleDistribution[] {
  return [{ ...ANSIBLE_DISTRIBUTION_FIXTURE }];
}
function seedCollectionVersions(): CollectionVersion[] {
  return [{ ...COLLECTION_VERSION_FIXTURE }];
}
function seedAnsibleRoles(): AnsibleRole[] {
  return [{ ...ANSIBLE_ROLE_FIXTURE }];
}

let ansibleRepositories = seedAnsibleRepositories();
let collectionRemotes = seedCollectionRemotes();
let ansibleDistributions = seedAnsibleDistributions();
let collectionVersions = seedCollectionVersions();
let ansibleRoles = seedAnsibleRoles();
let collectionSignatures: {
  pulp_href: string;
  signed_collection: string;
  pubkey_fingerprint: string;
  signing_service: string | null;
}[] = [];
let collectionMarks: { pulp_href: string; marked_collection: string; value: string }[] =
  [];
let collectionDeprecations: { pulp_href: string; namespace: string; name: string }[] = [];

/** Restores every Ansible in-memory fixture store to its initial seed - call from `afterEach`. */
export function resetAnsibleFixtures() {
  ansibleRepositories = seedAnsibleRepositories();
  collectionRemotes = seedCollectionRemotes();
  ansibleDistributions = seedAnsibleDistributions();
  collectionVersions = seedCollectionVersions();
  ansibleRoles = seedAnsibleRoles();
  collectionSignatures = [];
  collectionMarks = [];
  collectionDeprecations = [];
}

const ansibleHandlers = [
  // Repositories
  http.get(ANSIBLE_REPO_BASE, ({ request }) => {
    const name = new URL(request.url).searchParams.get("name");
    const results = name
      ? ansibleRepositories.filter((r) => r.name === name)
      : ansibleRepositories;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(ANSIBLE_REPO_BASE, async ({ request }) => {
    const body = (await request.json()) as Partial<AnsibleRepository> & { name: string };
    const id = freshId();
    const repo: AnsibleRepository = {
      pulp_href: `${ANSIBLE_REPO_BASE}${id}/`,
      name: body.name,
      description: body.description ?? null,
      remote: body.remote ?? null,
      retain_repo_versions: body.retain_repo_versions ?? null,
      gpgkey: body.gpgkey ?? null,
      private: body.private ?? false,
      versions_href: `${ANSIBLE_REPO_BASE}${id}/versions/`,
      latest_version_href: `${ANSIBLE_REPO_BASE}${id}/versions/0/`,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    ansibleRepositories = [...ansibleRepositories, repo];
    return HttpResponse.json(repo, { status: 201 });
  }),
  http.delete(`${ANSIBLE_REPO_BASE}:id/`, ({ params }) => {
    const href = `${ANSIBLE_REPO_BASE}${params.id}/`;
    ansibleRepositories = ansibleRepositories.filter((r) => r.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete repository") },
      { status: 202 },
    );
  }),
  http.patch(`${ANSIBLE_REPO_BASE}:id/`, async ({ params, request }) => {
    const href = `${ANSIBLE_REPO_BASE}${params.id}/`;
    const body = (await request.json()) as Partial<AnsibleRepository>;
    ansibleRepositories = ansibleRepositories.map((r) =>
      r.pulp_href === href ? { ...r, ...body } : r,
    );
    return HttpResponse.json(
      { task: registerTask("Update repository") },
      { status: 202 },
    );
  }),
  http.post(`${ANSIBLE_REPO_BASE}:id/sync/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Sync repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.post(`${ANSIBLE_REPO_BASE}:id/sign/`, () =>
    HttpResponse.json({ task: registerTask("Sign content") }, { status: 202 }),
  ),
  http.post(`${ANSIBLE_REPO_BASE}:id/mark/`, async ({ request }) => {
    const body = (await request.json()) as { value: string };
    return HttpResponse.json(
      { task: registerTask(`Mark content "${body.value}"`) },
      { status: 202 },
    );
  }),
  http.post(`${ANSIBLE_REPO_BASE}:id/unmark/`, async ({ request }) => {
    const body = (await request.json()) as { value: string };
    return HttpResponse.json(
      { task: registerTask(`Unmark content "${body.value}"`) },
      { status: 202 },
    );
  }),
  http.get(`${ANSIBLE_REPO_BASE}:id/versions/`, ({ params }) => {
    const results = ANSIBLE_VERSION_FIXTURES.filter(
      (v) => v.repository === `${ANSIBLE_REPO_BASE}${params.id}/`,
    );
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),

  // Remotes - three flavors
  http.get(COLLECTION_REMOTE_BASE, () =>
    HttpResponse.json({
      count: collectionRemotes.length,
      next: null,
      previous: null,
      results: collectionRemotes,
    }),
  ),
  http.post(COLLECTION_REMOTE_BASE, async ({ request }) => {
    const body = (await request.json()) as Partial<CollectionRemote> & {
      name: string;
      url: string;
    };
    const remote: CollectionRemote = {
      ...COLLECTION_REMOTE_FIXTURE,
      ...body,
      pulp_href: `${COLLECTION_REMOTE_BASE}${freshId()}/`,
    };
    collectionRemotes = [...collectionRemotes, remote];
    return HttpResponse.json(remote, { status: 201 });
  }),
  http.delete(`${COLLECTION_REMOTE_BASE}:id/`, ({ params }) => {
    const href = `${COLLECTION_REMOTE_BASE}${params.id}/`;
    collectionRemotes = collectionRemotes.filter((r) => r.pulp_href !== href);
    return HttpResponse.json({ task: registerTask("Delete remote") }, { status: 202 });
  }),
  http.patch(`${COLLECTION_REMOTE_BASE}:id/`, () =>
    HttpResponse.json({ task: registerTask("Update remote") }, { status: 202 }),
  ),
  http.get(GIT_REMOTE_BASE, () =>
    HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
  ),
  http.get(ROLE_REMOTE_BASE, () =>
    HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
  ),

  // Distributions
  http.get(ANSIBLE_DIST_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repository = url.searchParams.get("repository");
    const results = repository
      ? ansibleDistributions.filter((d) => d.repository === repository)
      : ansibleDistributions;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(ANSIBLE_DIST_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      base_path: string;
      repository?: string;
    };
    const dist: AnsibleDistribution = {
      pulp_href: `${ANSIBLE_DIST_BASE}${freshId()}/`,
      name: body.name,
      base_path: body.base_path,
      repository: body.repository ?? null,
      repository_version: null,
      client_url: `https://pulp.example.com/pulp_ansible/galaxy/${body.base_path}/`,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    ansibleDistributions = [...ansibleDistributions, dist];
    return HttpResponse.json(
      { task: registerTask(`Create distribution "${body.name}"`) },
      { status: 202 },
    );
  }),
  http.delete(`${ANSIBLE_DIST_BASE}:id/`, ({ params }) => {
    const href = `${ANSIBLE_DIST_BASE}${params.id}/`;
    ansibleDistributions = ansibleDistributions.filter((d) => d.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete distribution") },
      { status: 202 },
    );
  }),

  // Collection versions
  http.get(COLLECTION_VERSIONS_BASE, () =>
    HttpResponse.json({
      count: collectionVersions.length,
      next: null,
      previous: null,
      results: collectionVersions,
    }),
  ),
  http.post(COLLECTION_VERSIONS_BASE, () =>
    HttpResponse.json({ task: registerTask("Upload collection") }, { status: 202 }),
  ),

  // Roles
  http.get(ANSIBLE_ROLES_BASE, () =>
    HttpResponse.json({
      count: ansibleRoles.length,
      next: null,
      previous: null,
      results: ansibleRoles,
    }),
  ),
  http.post(ANSIBLE_ROLES_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      namespace: string;
      version: string;
    };
    const role: AnsibleRole = {
      pulp_href: `${ANSIBLE_ROLES_BASE}${freshId()}/`,
      name: body.name,
      namespace: body.namespace,
      version: body.version,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    ansibleRoles = [...ansibleRoles, role];
    return HttpResponse.json(role, { status: 201 });
  }),

  // Generic pulpcore Artifacts endpoint - used by role upload's
  // find-or-create-by-sha256 flow (src/api/client/ansible/roles.ts).
  http.get(ARTIFACTS_BASE, () =>
    HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
  ),
  http.post(ARTIFACTS_BASE, () =>
    HttpResponse.json({ pulp_href: `${ARTIFACTS_BASE}${freshId()}/` }, { status: 201 }),
  ),

  // Signatures / marks / deprecations - read-only lists plus the
  // deprecation create action (signatures/marks are created via the
  // repository sign/mark actions above, not posted here directly).
  http.get(COLLECTION_SIGNATURES_BASE, () =>
    HttpResponse.json({
      count: collectionSignatures.length,
      next: null,
      previous: null,
      results: collectionSignatures,
    }),
  ),
  http.get(COLLECTION_MARKS_BASE, () =>
    HttpResponse.json({
      count: collectionMarks.length,
      next: null,
      previous: null,
      results: collectionMarks,
    }),
  ),
  http.get(COLLECTION_DEPRECATIONS_BASE, () =>
    HttpResponse.json({
      count: collectionDeprecations.length,
      next: null,
      previous: null,
      results: collectionDeprecations,
    }),
  ),
  http.post(COLLECTION_DEPRECATIONS_BASE, async ({ request }) => {
    const body = (await request.json()) as { namespace: string; name: string };
    collectionDeprecations = [
      ...collectionDeprecations,
      {
        pulp_href: `${COLLECTION_DEPRECATIONS_BASE}${freshId()}/`,
        namespace: body.namespace,
        name: body.name,
      },
    ];
    return HttpResponse.json(
      { task: registerTask(`Deprecate "${body.namespace}.${body.name}"`) },
      { status: 202 },
    );
  }),

  // Signing services - read-only, empty by default (VERIFIED live: this dev
  // instance has none configured either).
  http.get(SIGNING_SERVICES_BASE, () =>
    HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
  ),

  // Copy content between repository versions.
  http.post(ANSIBLE_COPY_BASE, () =>
    HttpResponse.json({ task: registerTask("Copy content") }, { status: 202 }),
  ),
];

// -----------------------------------------------------------------------
// Container fixtures/handlers - VERIFIED against a live pulpcore 3.116.0 /
// pulp_container 2.29.0 instance (docs/PULP_API.md "Container endpoints"),
// mirroring the RPM/Ansible in-memory mutable store pattern above.

const CONTAINER_REPO_BASE = "/pulp/api/v3/repositories/container/container/";
const CONTAINER_REMOTE_BASE = "/pulp/api/v3/remotes/container/container/";
const CONTAINER_DIST_BASE = "/pulp/api/v3/distributions/container/container/";
const CONTAINER_TAGS_BASE = "/pulp/api/v3/content/container/tags/";
const CONTAINER_MANIFESTS_BASE = "/pulp/api/v3/content/container/manifests/";

export const CONTAINER_REPO_FIXTURE: ContainerRepository = {
  pulp_href: `${CONTAINER_REPO_BASE}container-repo-1/`,
  name: "test-container-repo",
  description: "A clean test container repository",
  remote: `${CONTAINER_REMOTE_BASE}container-remote-1/`,
  retain_repo_versions: null,
  versions_href: `${CONTAINER_REPO_BASE}container-repo-1/versions/`,
  latest_version_href: `${CONTAINER_REPO_BASE}container-repo-1/versions/1/`,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

export const CONTAINER_VERSION_FIXTURES = [
  {
    pulp_href: `${CONTAINER_REPO_BASE}container-repo-1/versions/1/`,
    number: 1,
    repository: CONTAINER_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:05:00.000000Z",
    content_summary: {
      added: {},
      removed: {},
      present: {
        "container.tag": { count: 1, href: "" },
        "container.manifest": { count: 1, href: "" },
      },
    },
  },
  {
    pulp_href: `${CONTAINER_REPO_BASE}container-repo-1/versions/0/`,
    number: 0,
    repository: CONTAINER_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:00:00.000000Z",
    content_summary: { added: {}, removed: {}, present: {} },
  },
];

export const CONTAINER_REMOTE_FIXTURE: ContainerRemote = {
  pulp_href: `${CONTAINER_REMOTE_BASE}container-remote-1/`,
  name: "test-container-remote",
  url: "https://registry.hub.docker.com",
  upstream_name: "library/busybox",
  policy: "immediate",
  pulp_created: "2026-08-20T10:00:00.000000Z",
  proxy_url: null,
  tls_validation: true,
  ca_cert: null,
  hidden_fields: [{ name: "password", is_set: false }],
  includes: null,
  excludes: null,
};

export const CONTAINER_DISTRIBUTION_FIXTURE: ContainerDistribution = {
  pulp_href: `${CONTAINER_DIST_BASE}container-dist-1/`,
  name: "test-container-dist",
  base_path: "test-container-dist",
  repository: CONTAINER_REPO_FIXTURE.pulp_href,
  repository_version: null,
  private: false,
  description: null,
  registry_path: "pulp.example.com/test-container-dist",
};

export const CONTAINER_TAG_FIXTURE: ContainerTag = {
  pulp_href: `${CONTAINER_TAGS_BASE}tag-1/`,
  name: "latest",
  tagged_manifest: `${CONTAINER_MANIFESTS_BASE}manifest-1/`,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

export const CONTAINER_MANIFEST_FIXTURE: ContainerManifest = {
  pulp_href: `${CONTAINER_MANIFESTS_BASE}manifest-1/`,
  digest: "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567",
  schema_version: 2,
  media_type: "application/vnd.docker.distribution.manifest.v2+json",
  architecture: "amd64",
  os: "linux",
  compressed_image_size: 2_100_000,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

function seedContainerRepositories(): ContainerRepository[] {
  return [{ ...CONTAINER_REPO_FIXTURE }];
}
function seedContainerRemotes(): ContainerRemote[] {
  return [{ ...CONTAINER_REMOTE_FIXTURE }];
}
function seedContainerDistributions(): ContainerDistribution[] {
  return [{ ...CONTAINER_DISTRIBUTION_FIXTURE }];
}
function seedContainerTags(): ContainerTag[] {
  return [{ ...CONTAINER_TAG_FIXTURE }];
}
function seedContainerManifests(): ContainerManifest[] {
  return [{ ...CONTAINER_MANIFEST_FIXTURE }];
}

let containerRepositories = seedContainerRepositories();
let containerRemotes = seedContainerRemotes();
let containerDistributions = seedContainerDistributions();
let containerTags = seedContainerTags();
let containerManifests = seedContainerManifests();

export function resetContainerFixtures() {
  containerRepositories = seedContainerRepositories();
  containerRemotes = seedContainerRemotes();
  containerDistributions = seedContainerDistributions();
  containerTags = seedContainerTags();
  containerManifests = seedContainerManifests();
}

const containerHandlers = [
  // Repositories
  http.get(CONTAINER_REPO_BASE, ({ request }) => {
    const name = new URL(request.url).searchParams.get("name");
    const results = name
      ? containerRepositories.filter((r) => r.name === name)
      : containerRepositories;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(CONTAINER_REPO_BASE, async ({ request }) => {
    const body = (await request.json()) as Partial<ContainerRepository> & {
      name: string;
    };
    const id = freshId();
    const repo: ContainerRepository = {
      pulp_href: `${CONTAINER_REPO_BASE}${id}/`,
      name: body.name,
      description: body.description ?? null,
      remote: body.remote ?? null,
      retain_repo_versions: body.retain_repo_versions ?? null,
      versions_href: `${CONTAINER_REPO_BASE}${id}/versions/`,
      latest_version_href: `${CONTAINER_REPO_BASE}${id}/versions/0/`,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    containerRepositories = [...containerRepositories, repo];
    return HttpResponse.json(repo, { status: 201 });
  }),
  http.delete(`${CONTAINER_REPO_BASE}:id/`, ({ params }) => {
    const href = `${CONTAINER_REPO_BASE}${params.id}/`;
    containerRepositories = containerRepositories.filter((r) => r.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete repository") },
      { status: 202 },
    );
  }),
  http.patch(`${CONTAINER_REPO_BASE}:id/`, async ({ params, request }) => {
    const href = `${CONTAINER_REPO_BASE}${params.id}/`;
    const body = (await request.json()) as Partial<ContainerRepository>;
    containerRepositories = containerRepositories.map((r) =>
      r.pulp_href === href ? { ...r, ...body } : r,
    );
    return HttpResponse.json(
      { task: registerTask("Update repository") },
      { status: 202 },
    );
  }),
  http.post(`${CONTAINER_REPO_BASE}:id/sync/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Sync repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.post(`${CONTAINER_REPO_BASE}:id/tag/`, async ({ request }) => {
    const body = (await request.json()) as { tag: string };
    return HttpResponse.json(
      { task: registerTask(`Tag "${body.tag}"`) },
      { status: 202 },
    );
  }),
  http.post(`${CONTAINER_REPO_BASE}:id/untag/`, async ({ request }) => {
    const body = (await request.json()) as { tag: string };
    return HttpResponse.json(
      { task: registerTask(`Remove tag "${body.tag}"`) },
      { status: 202 },
    );
  }),
  http.post(`${CONTAINER_REPO_BASE}:id/copy_tags/`, () =>
    HttpResponse.json({ task: registerTask("Copy tags") }, { status: 202 }),
  ),
  http.post(`${CONTAINER_REPO_BASE}:id/copy_manifests/`, () =>
    HttpResponse.json({ task: registerTask("Copy manifests") }, { status: 202 }),
  ),
  http.get(`${CONTAINER_REPO_BASE}:id/versions/`, ({ params }) => {
    const results = CONTAINER_VERSION_FIXTURES.filter(
      (v) => v.repository === `${CONTAINER_REPO_BASE}${params.id}/`,
    );
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),

  // Remotes
  http.get(CONTAINER_REMOTE_BASE, () =>
    HttpResponse.json({
      count: containerRemotes.length,
      next: null,
      previous: null,
      results: containerRemotes,
    }),
  ),
  http.post(CONTAINER_REMOTE_BASE, async ({ request }) => {
    const body = (await request.json()) as Partial<ContainerRemote> & {
      name: string;
      url: string;
    };
    const remote: ContainerRemote = {
      ...CONTAINER_REMOTE_FIXTURE,
      ...body,
      pulp_href: `${CONTAINER_REMOTE_BASE}${freshId()}/`,
    };
    containerRemotes = [...containerRemotes, remote];
    return HttpResponse.json(remote, { status: 201 });
  }),
  http.delete(`${CONTAINER_REMOTE_BASE}:id/`, ({ params }) => {
    const href = `${CONTAINER_REMOTE_BASE}${params.id}/`;
    containerRemotes = containerRemotes.filter((r) => r.pulp_href !== href);
    return HttpResponse.json({ task: registerTask("Delete remote") }, { status: 202 });
  }),
  http.patch(`${CONTAINER_REMOTE_BASE}:id/`, () =>
    HttpResponse.json({ task: registerTask("Update remote") }, { status: 202 }),
  ),

  // Distributions
  http.get(CONTAINER_DIST_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repository = url.searchParams.get("repository");
    const results = repository
      ? containerDistributions.filter((d) => d.repository === repository)
      : containerDistributions;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(CONTAINER_DIST_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      base_path: string;
      repository?: string;
      private?: boolean;
    };
    const dist: ContainerDistribution = {
      pulp_href: `${CONTAINER_DIST_BASE}${freshId()}/`,
      name: body.name,
      base_path: body.base_path,
      repository: body.repository ?? null,
      repository_version: null,
      private: body.private ?? false,
      description: null,
      registry_path: `pulp.example.com/${body.base_path}`,
    };
    containerDistributions = [...containerDistributions, dist];
    return HttpResponse.json(
      { task: registerTask(`Create distribution "${body.name}"`) },
      { status: 202 },
    );
  }),
  http.delete(`${CONTAINER_DIST_BASE}:id/`, ({ params }) => {
    const href = `${CONTAINER_DIST_BASE}${params.id}/`;
    containerDistributions = containerDistributions.filter((d) => d.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete distribution") },
      { status: 202 },
    );
  }),

  // Tags / manifests - read-only lists (unfiltered - mirrors the Ansible
  // collection_versions handler's same simplification).
  http.get(CONTAINER_TAGS_BASE, () =>
    HttpResponse.json({
      count: containerTags.length,
      next: null,
      previous: null,
      results: containerTags,
    }),
  ),
  http.get(CONTAINER_MANIFESTS_BASE, () =>
    HttpResponse.json({
      count: containerManifests.length,
      next: null,
      previous: null,
      results: containerManifests,
    }),
  ),
];

// -----------------------------------------------------------------------
// Access (Users/Groups/Roles/role assignments) fixtures/handlers -
// VERIFIED against a live pulpcore 3.116.0 instance (docs/PULP_API.md
// "Access endpoints"). Unlike RPM/Ansible/Container, this whole domain is
// synchronous (never a task) - mirrors that: every mutation below returns
// its result directly, no registerTask/task fixture involved.

const ACCESS_USERS_BASE = "/pulp/api/v3/users/";
const ACCESS_GROUPS_BASE = "/pulp/api/v3/groups/";
const ACCESS_ROLES_BASE = "/pulp/api/v3/roles/";

export const ACCESS_USER_FIXTURE: User = {
  pulp_href: `${ACCESS_USERS_BASE}1/`,
  id: 1,
  username: "test-user",
  first_name: "",
  last_name: "",
  email: "",
  is_staff: false,
  is_active: true,
  date_joined: "2026-08-20T10:00:00.000000Z",
  hidden_fields: [{ name: "password", is_set: true }],
};

export const ACCESS_GROUP_FIXTURE: Group = {
  pulp_href: `${ACCESS_GROUPS_BASE}1/`,
  id: 1,
  name: "test-group",
};

export const ACCESS_CUSTOM_ROLE_FIXTURE: Role = {
  pulp_href: `${ACCESS_ROLES_BASE}1/`,
  name: "test_org.custom_role",
  description: "A test custom role",
  permissions: ["rpm.view_rpmrepository"],
  locked: false,
};

export const ACCESS_LOCKED_ROLE_FIXTURE: Role = {
  pulp_href: `${ACCESS_ROLES_BASE}2/`,
  name: "rpm.rpmrepository_viewer",
  description: null,
  permissions: ["rpm.view_rpmrepository"],
  locked: true,
};

function seedAccessUsers(): User[] {
  return [{ ...ACCESS_USER_FIXTURE }];
}
function seedAccessGroups(): Group[] {
  return [{ ...ACCESS_GROUP_FIXTURE }];
}
function seedAccessRoles(): Role[] {
  return [{ ...ACCESS_CUSTOM_ROLE_FIXTURE }, { ...ACCESS_LOCKED_ROLE_FIXTURE }];
}

let accessUsers = seedAccessUsers();
let accessGroups = seedAccessGroups();
let accessRoles = seedAccessRoles();
let userRoleAssignments: (RoleAssignment & { userHref: string })[] = [];
let groupRoleAssignments: (RoleAssignment & { groupHref: string })[] = [];
let groupMemberships: (GroupUser & { groupHref: string })[] = [];
let objectRoleAssignments: {
  objectHref: string;
  role: string;
  users: string[];
  groups: string[];
}[] = [];

export function resetAccessFixtures() {
  accessUsers = seedAccessUsers();
  accessGroups = seedAccessGroups();
  accessRoles = seedAccessRoles();
  userRoleAssignments = [];
  groupRoleAssignments = [];
  groupMemberships = [];
  objectRoleAssignments = [];
}

function roleDescriptionAndPermissions(roleName: string): {
  description: string | null;
  permissions: string[];
} {
  const role = accessRoles.find((r) => r.name === roleName);
  return { description: role?.description ?? null, permissions: role?.permissions ?? [] };
}

const accessHandlers = [
  // Users
  http.get(ACCESS_USERS_BASE, ({ request }) => {
    const url = new URL(request.url);
    const username = url.searchParams.get("username");
    const usernameIcontains = url.searchParams.get("username__icontains");
    let results = accessUsers;
    if (username) {
      results = results.filter((u) => u.username === username);
    } else if (usernameIcontains) {
      results = results.filter((u) => u.username.includes(usernameIcontains));
    }
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.get(`${ACCESS_USERS_BASE}:id/`, ({ params }) => {
    const href = `${ACCESS_USERS_BASE}${params.id}/`;
    const user = accessUsers.find((u) => u.pulp_href === href);
    return user
      ? HttpResponse.json(user)
      : HttpResponse.json({ detail: "Not found." }, { status: 404 });
  }),
  http.post(ACCESS_USERS_BASE, async ({ request }) => {
    const body = (await request.json()) as Partial<User> & { username: string };
    const id = accessUsers.length + userRoleAssignments.length + 100;
    const user: User = {
      pulp_href: `${ACCESS_USERS_BASE}${id}/`,
      id,
      username: body.username,
      first_name: body.first_name ?? "",
      last_name: body.last_name ?? "",
      email: body.email ?? "",
      is_staff: body.is_staff ?? false,
      is_active: body.is_active ?? true,
      date_joined: "2026-08-20T11:00:00.000000Z",
      hidden_fields: [
        { name: "password", is_set: Boolean((body as { password?: string }).password) },
      ],
    };
    accessUsers = [...accessUsers, user];
    return HttpResponse.json(user, { status: 201 });
  }),
  http.patch(`${ACCESS_USERS_BASE}:id/`, async ({ params, request }) => {
    const href = `${ACCESS_USERS_BASE}${params.id}/`;
    const body = (await request.json()) as Partial<User>;
    let updated: User | undefined;
    accessUsers = accessUsers.map((u) => {
      if (u.pulp_href !== href) return u;
      updated = { ...u, ...body };
      return updated;
    });
    return HttpResponse.json(updated);
  }),
  http.delete(`${ACCESS_USERS_BASE}:id/`, ({ params }) => {
    const href = `${ACCESS_USERS_BASE}${params.id}/`;
    accessUsers = accessUsers.filter((u) => u.pulp_href !== href);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${ACCESS_USERS_BASE}:id/roles/`, ({ params }) => {
    const href = `${ACCESS_USERS_BASE}${params.id}/`;
    const results = userRoleAssignments.filter((a) => a.userHref === href);
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(`${ACCESS_USERS_BASE}:id/roles/`, async ({ params, request }) => {
    const href = `${ACCESS_USERS_BASE}${params.id}/`;
    const body = (await request.json()) as {
      role: string;
      content_object: string | null;
    };
    if (body.content_object === undefined) {
      return HttpResponse.json(
        {
          non_field_errors: [
            "Either 'content_object' or 'content_object_prn' needs to be specified.",
          ],
        },
        { status: 400 },
      );
    }
    const assignment: RoleAssignment & { userHref: string } = {
      pulp_href: `${ACCESS_USERS_BASE}${params.id}/roles/${freshId()}/`,
      role: body.role,
      content_object: body.content_object,
      content_object_prn: null,
      userHref: href,
      ...roleDescriptionAndPermissions(body.role),
    };
    userRoleAssignments = [...userRoleAssignments, assignment];
    return HttpResponse.json(assignment, { status: 201 });
  }),
  http.delete(`${ACCESS_USERS_BASE}:id/roles/:assignmentId/`, ({ params }) => {
    const href = `${ACCESS_USERS_BASE}${params.id}/roles/${params.assignmentId}/`;
    userRoleAssignments = userRoleAssignments.filter((a) => a.pulp_href !== href);
    return new HttpResponse(null, { status: 204 });
  }),

  // Groups
  http.get(ACCESS_GROUPS_BASE, ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const nameIcontains = url.searchParams.get("name__icontains");
    let results = accessGroups;
    if (name) {
      results = results.filter((g) => g.name === name);
    } else if (nameIcontains) {
      results = results.filter((g) => g.name.includes(nameIcontains));
    }
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(ACCESS_GROUPS_BASE, async ({ request }) => {
    const body = (await request.json()) as { name: string };
    const id = accessGroups.length + 100;
    const group: Group = {
      pulp_href: `${ACCESS_GROUPS_BASE}${id}/`,
      id,
      name: body.name,
    };
    accessGroups = [...accessGroups, group];
    return HttpResponse.json(group, { status: 201 });
  }),
  http.delete(`${ACCESS_GROUPS_BASE}:id/`, ({ params }) => {
    const href = `${ACCESS_GROUPS_BASE}${params.id}/`;
    accessGroups = accessGroups.filter((g) => g.pulp_href !== href);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${ACCESS_GROUPS_BASE}:id/users/`, ({ params }) => {
    const href = `${ACCESS_GROUPS_BASE}${params.id}/`;
    const results = groupMemberships.filter((m) => m.groupHref === href);
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(`${ACCESS_GROUPS_BASE}:id/users/`, async ({ params, request }) => {
    const href = `${ACCESS_GROUPS_BASE}${params.id}/`;
    const body = (await request.json()) as { username: string };
    const user = accessUsers.find((u) => u.username === body.username);
    const member: GroupUser & { groupHref: string } = {
      pulp_href: user?.pulp_href ?? `${ACCESS_USERS_BASE}999/`,
      username: body.username,
      groupHref: href,
    };
    groupMemberships = [...groupMemberships, member];
    return HttpResponse.json(member, { status: 201 });
  }),
  http.delete(`${ACCESS_GROUPS_BASE}:id/users/:userId/`, ({ params }) => {
    const groupHref = `${ACCESS_GROUPS_BASE}${params.id}/`;
    const userHref = `${ACCESS_USERS_BASE}${params.userId}/`;
    groupMemberships = groupMemberships.filter(
      (m) => !(m.groupHref === groupHref && m.pulp_href === userHref),
    );
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${ACCESS_GROUPS_BASE}:id/roles/`, ({ params }) => {
    const href = `${ACCESS_GROUPS_BASE}${params.id}/`;
    const results = groupRoleAssignments.filter((a) => a.groupHref === href);
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(`${ACCESS_GROUPS_BASE}:id/roles/`, async ({ params, request }) => {
    const href = `${ACCESS_GROUPS_BASE}${params.id}/`;
    const body = (await request.json()) as {
      role: string;
      content_object: string | null;
    };
    const assignment: RoleAssignment & { groupHref: string } = {
      pulp_href: `${ACCESS_GROUPS_BASE}${params.id}/roles/${freshId()}/`,
      role: body.role,
      content_object: body.content_object,
      content_object_prn: null,
      groupHref: href,
      ...roleDescriptionAndPermissions(body.role),
    };
    groupRoleAssignments = [...groupRoleAssignments, assignment];
    return HttpResponse.json(assignment, { status: 201 });
  }),
  http.delete(`${ACCESS_GROUPS_BASE}:id/roles/:assignmentId/`, ({ params }) => {
    const href = `${ACCESS_GROUPS_BASE}${params.id}/roles/${params.assignmentId}/`;
    groupRoleAssignments = groupRoleAssignments.filter((a) => a.pulp_href !== href);
    return new HttpResponse(null, { status: 204 });
  }),

  // Roles
  http.get(ACCESS_ROLES_BASE, ({ request }) => {
    const url = new URL(request.url);
    const nameIcontains = url.searchParams.get("name__icontains");
    const locked = url.searchParams.get("locked");
    let results = accessRoles;
    if (nameIcontains) {
      results = results.filter((r) => r.name.includes(nameIcontains));
    }
    if (locked !== null) {
      results = results.filter((r) => String(r.locked) === locked);
    }
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(ACCESS_ROLES_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      permissions: string[];
    };
    const id = accessRoles.length + 100;
    const role: Role = {
      pulp_href: `${ACCESS_ROLES_BASE}${id}/`,
      name: body.name,
      description: body.description ?? null,
      permissions: body.permissions,
      locked: false,
    };
    accessRoles = [...accessRoles, role];
    return HttpResponse.json(role, { status: 201 });
  }),
  http.patch(`${ACCESS_ROLES_BASE}:id/`, async ({ params, request }) => {
    const href = `${ACCESS_ROLES_BASE}${params.id}/`;
    const existing = accessRoles.find((r) => r.pulp_href === href);
    if (existing?.locked) {
      return HttpResponse.json({ detail: "The role is locked." }, { status: 403 });
    }
    const body = (await request.json()) as Partial<Role>;
    let updated: Role | undefined;
    accessRoles = accessRoles.map((r) => {
      if (r.pulp_href !== href) return r;
      updated = { ...r, ...body };
      return updated;
    });
    return HttpResponse.json(updated);
  }),
  http.delete(`${ACCESS_ROLES_BASE}:id/`, ({ params }) => {
    const href = `${ACCESS_ROLES_BASE}${params.id}/`;
    const existing = accessRoles.find((r) => r.pulp_href === href);
    if (existing?.locked) {
      return HttpResponse.json({ detail: "The role is locked." }, { status: 403 });
    }
    accessRoles = accessRoles.filter((r) => r.pulp_href !== href);
    return new HttpResponse(null, { status: 204 });
  }),

  // Generic per-object RBAC actions (add_role/remove_role/list_roles/
  // my_permissions) - present on every RBAC-protected object across every
  // plugin (VERIFIED live schema), matched here by suffix rather than one
  // handler per resource type/plugin.
  http.get("*/list_roles/", ({ request }) => {
    const objectHref = new URL(request.url).pathname.replace(/list_roles\/$/, "");
    const roles = objectRoleAssignments.filter((a) => a.objectHref === objectHref);
    return HttpResponse.json({ roles: roles.map(({ objectHref: _o, ...rest }) => rest) });
  }),
  http.get("*/my_permissions/", () => HttpResponse.json({ permissions: [] })),
  http.post("*/add_role/", async ({ request }) => {
    const objectHref = new URL(request.url).pathname.replace(/add_role\/$/, "");
    const body = (await request.json()) as {
      role: string;
      users?: string[];
      groups?: string[];
    };
    const users = body.users ?? [];
    const groups = body.groups ?? [];
    const existing = objectRoleAssignments.find(
      (a) => a.objectHref === objectHref && a.role === body.role,
    );
    if (existing) {
      existing.users = [...new Set([...existing.users, ...users])];
      existing.groups = [...new Set([...existing.groups, ...groups])];
    } else {
      objectRoleAssignments = [
        ...objectRoleAssignments,
        { objectHref, role: body.role, users, groups },
      ];
    }
    return HttpResponse.json({ role: body.role, users, groups }, { status: 201 });
  }),
  http.post("*/remove_role/", async ({ request }) => {
    const objectHref = new URL(request.url).pathname.replace(/remove_role\/$/, "");
    const body = (await request.json()) as {
      role: string;
      users?: string[];
      groups?: string[];
    };
    const users = body.users ?? [];
    const groups = body.groups ?? [];
    objectRoleAssignments = objectRoleAssignments
      .map((a) => {
        if (a.objectHref !== objectHref || a.role !== body.role) return a;
        return {
          ...a,
          users: a.users.filter((u) => !users.includes(u)),
          groups: a.groups.filter((g) => !groups.includes(g)),
        };
      })
      .filter((a) => a.users.length > 0 || a.groups.length > 0);
    return HttpResponse.json({ role: body.role, users, groups }, { status: 201 });
  }),
];

// -----------------------------------------------------------------------
// Administration (Signing services / Content guards) fixtures/handlers -
// VERIFIED against a live pulpcore 3.116.0 instance (docs/PULP_API.md
// "Administration endpoints"). Signing services are read-only (no
// POST/PUT/PATCH/DELETE at all); content guards are synchronous CRUD, same
// as the rest of the Access domain.

const SIGNING_SERVICES_ADMIN_BASE = "/pulp/api/v3/signing-services/";
const CONTENTGUARDS_GENERIC_BASE = "/pulp/api/v3/contentguards/";
const HEADER_GUARD_BASE = "/pulp/api/v3/contentguards/core/header/";
const RBAC_GUARD_BASE = "/pulp/api/v3/contentguards/core/rbac/";
const CONTENT_REDIRECT_GUARD_BASE = "/pulp/api/v3/contentguards/core/content_redirect/";
const COMPOSITE_GUARD_BASE = "/pulp/api/v3/contentguards/core/composite/";
const X509_GUARD_BASE = "/pulp/api/v3/contentguards/certguard/x509/";
const RHSM_GUARD_BASE = "/pulp/api/v3/contentguards/certguard/rhsm/";

interface MutableContentGuard {
  pulp_href: string;
  prn: string;
  name: string;
  description: string | null;
  header_name?: string;
  header_value?: string;
  jq_filter?: string | null;
  ca_certificate?: string;
  guards?: string[];
}

export const HEADER_GUARD_FIXTURE: MutableContentGuard = {
  pulp_href: `${HEADER_GUARD_BASE}header-guard-1/`,
  prn: "prn:core.headercontentguard:header-guard-1",
  name: "test-header-guard",
  description: "A test header content guard",
  header_name: "X-Api-Key",
  header_value: "secret123",
  jq_filter: null,
};

export const RBAC_GUARD_FIXTURE: MutableContentGuard = {
  pulp_href: `${RBAC_GUARD_BASE}rbac-guard-1/`,
  prn: "prn:core.rbaccontentguard:rbac-guard-1",
  name: "test-rbac-guard",
  description: null,
};

function seedSigningServices(): SigningService[] {
  return [];
}
function seedContentGuards(): MutableContentGuard[] {
  return [{ ...HEADER_GUARD_FIXTURE }, { ...RBAC_GUARD_FIXTURE }];
}

let signingServicesAdmin = seedSigningServices();
let contentGuards = seedContentGuards();

export function resetAdministrationFixtures() {
  signingServicesAdmin = seedSigningServices();
  contentGuards = seedContentGuards();
}

function makeGuardHandlers(
  base: string,
  contentType: string,
  extraDefaults: Record<string, unknown>,
) {
  return [
    http.get(base, ({ request }) => {
      const nameIcontains = new URL(request.url).searchParams.get("name__icontains");
      let results = contentGuards.filter((g) => g.pulp_href.startsWith(base));
      if (nameIcontains) {
        results = results.filter((g) => g.name.includes(nameIcontains));
      }
      return HttpResponse.json({
        count: results.length,
        next: null,
        previous: null,
        results,
      });
    }),
    http.post(base, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown> & { name: string };
      const id = freshId();
      const guard: MutableContentGuard = {
        pulp_href: `${base}${id}/`,
        prn: `prn:${contentType}:${id}`,
        description: null,
        ...extraDefaults,
        ...body,
      };
      contentGuards = [...contentGuards, guard];
      return HttpResponse.json(guard, { status: 201 });
    }),
    http.get(`${base}:id/`, ({ params }) => {
      const href = `${base}${params.id}/`;
      const guard = contentGuards.find((g) => g.pulp_href === href);
      return guard
        ? HttpResponse.json(guard)
        : HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }),
    http.patch(`${base}:id/`, async ({ params, request }) => {
      const href = `${base}${params.id}/`;
      const body = (await request.json()) as Record<string, unknown>;
      let updated: MutableContentGuard | undefined;
      contentGuards = contentGuards.map((g) => {
        if (g.pulp_href !== href) return g;
        updated = { ...g, ...body };
        return updated;
      });
      return HttpResponse.json(updated);
    }),
    // VERIFIED live: DELETE works on any guard's own href regardless of
    // flavor - registered per-flavor here since MSW matches exact path
    // prefixes (the generic `contentguards/` collection path doesn't
    // structurally overlap with `contentguards/core/header/<id>/` etc.).
    http.delete(`${base}:id/`, ({ params }) => {
      const href = `${base}${params.id}/`;
      contentGuards = contentGuards.filter((g) => g.pulp_href !== href);
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

const administrationHandlers = [
  http.get(SIGNING_SERVICES_ADMIN_BASE, ({ request }) => {
    const nameIcontains = new URL(request.url).searchParams.get("name__icontains");
    let results = signingServicesAdmin;
    if (nameIcontains) {
      results = results.filter((s) => s.name.includes(nameIcontains));
    }
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),

  // Generic cross-flavor list/delete - VERIFIED live: DELETE works on any
  // guard's own href regardless of flavor, and the generic list only ever
  // returns base fields (name/description), never the flavor-specific ones.
  http.get(CONTENTGUARDS_GENERIC_BASE, ({ request }) => {
    const nameIcontains = new URL(request.url).searchParams.get("name__icontains");
    let results = contentGuards.map(({ pulp_href, prn, name, description }) => ({
      pulp_href,
      prn,
      name,
      description,
    }));
    if (nameIcontains) {
      results = results.filter((g) => g.name.includes(nameIcontains));
    }
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  ...makeGuardHandlers(HEADER_GUARD_BASE, "core.headercontentguard", {
    header_name: "",
    header_value: "",
    jq_filter: null,
  }),
  ...makeGuardHandlers(RBAC_GUARD_BASE, "core.rbaccontentguard", {}),
  ...makeGuardHandlers(
    CONTENT_REDIRECT_GUARD_BASE,
    "core.contentredirectcontentguard",
    {},
  ),
  ...makeGuardHandlers(COMPOSITE_GUARD_BASE, "core.compositecontentguard", {
    guards: [],
  }),
  ...makeGuardHandlers(X509_GUARD_BASE, "certguard.x509certguard", {
    ca_certificate: "",
  }),
  ...makeGuardHandlers(RHSM_GUARD_BASE, "certguard.rhsmcertguard", {
    ca_certificate: "",
  }),
];

// Task history (docs/ROADMAP.md "Improved auditability") - the persistent
// /pulp/api/v3/tasks/ list page. Distinct from the `tasks` Map above (which
// simulates individual in-flight tasks for mutation polling) - reuses the
// same TASKS_BASE constant already declared in the RPM fixtures section.

export const TASK_HISTORY_FIXTURE_COMPLETED: PulpTask = {
  pulp_href: `${TASKS_BASE}history-1/`,
  name: "pulpcore.app.tasks.repository.sync",
  state: "completed",
  pulp_created: "2026-08-30T10:00:00.000000Z",
  started_at: "2026-08-30T10:00:01.000000Z",
  finished_at: "2026-08-30T10:00:05.000000Z",
  error: null,
  logging_cid: "abc123",
  created_by: ACCESS_USER_FIXTURE.pulp_href,
  reserved_resources_record: ["prn:rpm.rpmrepository:test"],
  created_resources: [],
};

export const TASK_HISTORY_FIXTURE_FAILED: PulpTask = {
  pulp_href: `${TASKS_BASE}history-2/`,
  name: "pulpcore.app.tasks.repository.publish",
  state: "failed",
  pulp_created: "2026-08-30T11:00:00.000000Z",
  started_at: "2026-08-30T11:00:01.000000Z",
  finished_at: "2026-08-30T11:00:02.000000Z",
  error: { description: "Remote server returned 404 Not Found" },
  logging_cid: "def456",
  created_by: null,
  reserved_resources_record: [],
  created_resources: [],
};

function seedTaskHistory(): PulpTask[] {
  return [{ ...TASK_HISTORY_FIXTURE_COMPLETED }, { ...TASK_HISTORY_FIXTURE_FAILED }];
}

let taskHistory = seedTaskHistory();

export function resetTasksFixtures() {
  taskHistory = seedTaskHistory();
}

const taskHistoryHandlers = [
  http.get(TASKS_BASE, ({ request }) => {
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const nameContains = url.searchParams.get("name__contains");
    let results = taskHistory;
    if (state) {
      results = results.filter((t) => t.state === state);
    }
    if (nameContains) {
      results = results.filter((t) => t.name?.includes(nameContains));
    }
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
];

// -----------------------------------------------------------------------
// pulpit-core (ADR 0006, docs/signing.md) - only the one endpoint the RPM
// repository create/edit forms call unconditionally on mount
// (useRepositorySigningPolicyQuery). Defaults to "nothing enabled" so
// RepositorySigningFieldGroup renders nothing by default across the whole
// suite (fail-closed - see that component's docstring); tests exercising
// the Signing section override this per-test with `server.use(...)`.
//
// content_size/sizes mirrors PULP_STATUS_FIXTURE's populated plugins
// (rpm/ansible/container) with a size and leaves core absent - matching
// pulpit-core's real behavior (core never appears, see
// pulpit-core/app/modules/content_size/models.py).
export const COMPONENT_CONTENT_SIZES_FIXTURE = [
  { component: "rpm", size_bytes: 200381, updated_at: "2026-01-01T00:00:00Z" },
  { component: "ansible", size_bytes: 2017, updated_at: "2026-01-01T00:00:00Z" },
  { component: "container", size_bytes: 52199, updated_at: "2026-01-01T00:00:00Z" },
];

const pulpitCoreHandlers = [
  http.get("/pulpit-core/api/v1/signing/repositories/policy", () =>
    HttpResponse.json({
      package_signing_enabled: false,
      metadata_signing_enabled: false,
      package_signing_service: null,
      package_signing_fingerprint: null,
      metadata_signing_service: null,
    }),
  ),

  http.get("/pulpit-core/api/v1/content_size/sizes", () =>
    HttpResponse.json(COMPONENT_CONTENT_SIZES_FIXTURE),
  ),

  // Empty by default (every RepositoriesPage's Size column shows "-" unless
  // a test overrides this with an entry matching its own repository's
  // pulp_href - see RPM/Ansible/Container RepositoriesPage.test.tsx).
  http.get("/pulpit-core/api/v1/content_size/repository-sizes", () =>
    HttpResponse.json([]),
  ),

  // No instance default proxy configured - every Create/Edit Remote modal
  // calls this unconditionally on mount (RemoteConnectionSettingsFields),
  // so this keeps every existing remote test's plain (no "use instance
  // default" toggle) fields unchanged. Tests exercising the default-proxy
  // behavior override this with `server.use(...)`.
  http.get("/pulpit-core/api/v1/default_settings/settings", () =>
    HttpResponse.json({
      id: "00000000-0000-0000-0000-000000000000",
      proxy_url: "",
      proxy_username: "",
      proxy_password_is_set: false,
      proxy_tls_validation: true,
      proxy_ca_cert: null,
      updated_at: "2026-01-01T00:00:00Z",
    }),
  ),
];

export const handlers = [
  ...authHandlers,
  ...rpmHandlers,
  ...ansibleHandlers,
  ...containerHandlers,
  ...accessHandlers,
  ...administrationHandlers,
  ...taskHistoryHandlers,
  ...pulpitCoreHandlers,
];
