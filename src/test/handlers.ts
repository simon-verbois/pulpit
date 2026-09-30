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
import type {
  FileContent,
  FileDistribution,
  FileGitRemote,
  FileRemote,
  FileRemoteCreate,
  FileRemoteUpdate,
  FileRepository,
} from "../api/client/file/types";
import type {
  HuggingFaceContent,
  HuggingFaceDistribution,
  HuggingFaceRemote,
  HuggingFaceRemoteCreate,
  HuggingFaceRemoteUpdate,
  HuggingFaceRepository,
} from "../api/client/hugging_face/types";
import type {
  GemContent,
  GemDistribution,
  GemRemote,
  GemRemoteCreate,
  GemRemoteUpdate,
  GemRepository,
} from "../api/client/gem/types";
import type {
  MavenContent,
  MavenDistribution,
  MavenRemote,
  MavenRemoteCreate,
  MavenRemoteUpdate,
  MavenRepository,
} from "../api/client/maven/types";
import type {
  NpmContent,
  NpmDistribution,
  NpmRemote,
  NpmRemoteCreate,
  NpmRemoteUpdate,
  NpmRepository,
} from "../api/client/npm/types";
import type {
  PythonContent,
  PythonDistribution,
  PythonRemote,
  PythonRemoteCreate,
  PythonRemoteUpdate,
  PythonRepository,
} from "../api/client/python/types";
import type {
  DebContent,
  DebDistribution,
  DebRemote,
  DebRemoteCreate,
  DebRemoteUpdate,
  DebRepository,
} from "../api/client/deb/types";

// VERIFIED: trimmed down from an actual /pulp/api/v3/status/ response
// captured against pulpcore 3.116.0 in the bootstrap dev Compose stack
// (docs/PULP_API.md). Only the fields Pulpit's UI actually reads are kept.
export const PULP_STATUS_FIXTURE = {
  versions: [
    { component: "core", version: "3.116.0", package: "pulpcore" },
    { component: "rpm", version: "3.38.5", package: "pulp-rpm" },
    { component: "container", version: "2.29.0", package: "pulp-container" },
    { component: "ansible", version: "0.30.0", package: "pulp-ansible" },
    { component: "file", version: "3.116.1", package: "pulpcore" },
    { component: "hugging_face", version: "0.3.2", package: "pulp-hugging-face" },
    { component: "gem", version: "0.8.0", package: "pulp-gem" },
    { component: "maven", version: "0.25.1", package: "pulp-maven" },
    { component: "npm", version: "0.10.1", package: "pulp-npm" },
    { component: "python", version: "3.35.0", package: "pulp-python" },
    { component: "deb", version: "3.10.0", package: "pulp-deb" },
  ],
  online_workers: [{}, {}],
  online_api_apps: [{}, {}],
  online_content_apps: [{}, {}],
  database_connection: { connected: true },
  redis_connection: { connected: false },
  storage: { total: 1021431513088, used: 66708217856, free: 954255859712 },
  content_settings: {
    content_origin: "http://pulp.example.com:8080",
    content_path_prefix: "/pulp/content/",
  },
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
  generate_repo_config: false,
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

  // Pulpit's remote connection test (derived Pulp image plugin,
  // deployment/docker/pulp/remote-check/) - always succeeds in fixtures.
  http.post("/pulp/api/v3/pulpit/remotes/:id/test/", ({ params }) => {
    const remote = [...remotes, ...ulnRemotes].find((r) =>
      r.pulp_href.endsWith(`/${String(params.id)}/`),
    );
    if (!remote) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json({
      ok: true,
      detail: "Repository metadata retrieved.",
      url: `${remote.url.replace(/\/+$/, "")}/repodata/repomd.xml`,
    });
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
      generate_repo_config?: boolean;
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
      generate_repo_config: body.generate_repo_config ?? false,
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
  http.patch(`${DIST_BASE}:id/`, async ({ params, request }) => {
    const href = `${DIST_BASE}${params.id}/`;
    const body = (await request.json()) as { generate_repo_config?: boolean };
    distributions = distributions.map((d) =>
      d.pulp_href === href
        ? {
            ...d,
            ...(body.generate_repo_config !== undefined
              ? { generate_repo_config: body.generate_repo_config }
              : {}),
          }
        : d,
    );
    return HttpResponse.json(
      { task: registerTask("Update distribution") },
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
    // Falls back to the persistent history below, so a history row's detail
    // modal (which fetches the task by href itself) resolves too.
    const task = tasks.get(href) ?? taskHistory.find((t) => t.pulp_href === href);
    if (!task) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(task);
  }),
];

// ---------------------------------------------------------------------------
// File fixtures - shapes VERIFIED against the live OpenAPI schema of a
// pulpcore 3.116.1 instance with pulp_file bundled in (component=file -
// docs/PULP_API.md, the pulp-api skill), mirroring the RPM in-memory
// mutable store pattern above.
const FILE_REPO_BASE = "/pulp/api/v3/repositories/file/file/";
const FILE_REMOTE_BASE = "/pulp/api/v3/remotes/file/file/";
const FILE_GIT_REMOTE_BASE = "/pulp/api/v3/remotes/file/git/";
const FILE_DIST_BASE = "/pulp/api/v3/distributions/file/file/";
const FILE_CONTENT_BASE = "/pulp/api/v3/content/file/files/";
const FILE_PUBLICATIONS_BASE = "/pulp/api/v3/publications/file/file/";

export const FILE_REMOTE_FIXTURE: FileRemote = {
  pulp_href: `${FILE_REMOTE_BASE}remote-1/`,
  name: "test-file-fixture",
  url: "https://fixtures.pulpproject.org/file/PULP_MANIFEST",
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

export const FILE_REPO_FIXTURE = {
  pulp_href: `${FILE_REPO_BASE}repo-1/`,
  name: "test-file-repo",
  description: "A test file repository",
  remote: FILE_REMOTE_FIXTURE.pulp_href,
  autopublish: false,
  manifest: null,
  versions_href: `${FILE_REPO_BASE}repo-1/versions/`,
  latest_version_href: `${FILE_REPO_BASE}repo-1/versions/1/`,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

export const FILE_VERSION_FIXTURES = [
  {
    pulp_href: `${FILE_REPO_BASE}repo-1/versions/1/`,
    number: 1,
    repository: FILE_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:05:00.000000Z",
    content_summary: {
      added: { "file.file": { count: 5, href: `${FILE_REPO_BASE}repo-1/versions/1/` } },
      removed: {},
      present: { "file.file": { count: 5, href: `${FILE_REPO_BASE}repo-1/versions/1/` } },
    },
  },
  {
    pulp_href: `${FILE_REPO_BASE}repo-1/versions/0/`,
    number: 0,
    repository: FILE_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:00:00.000000Z",
    content_summary: { added: {}, removed: {}, present: {} },
  },
];

export const FILE_CONTENT_FIXTURE: FileContent = {
  pulp_href: `${FILE_CONTENT_BASE}content-1/`,
  relative_path: "images/logo.png",
  sha256: "abc123",
};

export const FILE_DISTRIBUTION_FIXTURE = {
  pulp_href: `${FILE_DIST_BASE}dist-1/`,
  name: "existing-file-dist",
  base_path: "existing-file-dist-path",
  base_url: "https://pulp.example.com/pulp/content/existing-file-dist-path/",
  repository: FILE_REPO_FIXTURE.pulp_href,
  publication: null,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

function seedFileRepositories(): FileRepository[] {
  return [{ ...FILE_REPO_FIXTURE }];
}
function seedFileRemotes(): FileRemote[] {
  return [{ ...FILE_REMOTE_FIXTURE }];
}
function seedFileGitRemotes(): FileGitRemote[] {
  return [];
}
function seedFileDistributions(): FileDistribution[] {
  return [{ ...FILE_DISTRIBUTION_FIXTURE }];
}
function seedFileContent(): FileContent[] {
  return [{ ...FILE_CONTENT_FIXTURE }];
}

let fileRepositories = seedFileRepositories();
let fileRemotes = seedFileRemotes();
let fileGitRemotes = seedFileGitRemotes();
let fileDistributions = seedFileDistributions();
let fileContent = seedFileContent();

/** Restores every File in-memory fixture store to its initial seed - call from `afterEach`. */
export function resetFileFixtures() {
  fileRepositories = seedFileRepositories();
  fileRemotes = seedFileRemotes();
  fileGitRemotes = seedFileGitRemotes();
  fileDistributions = seedFileDistributions();
  fileContent = seedFileContent();
}

const fileHandlers = [
  // Repositories
  http.get(FILE_REPO_BASE, ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const results = name
      ? fileRepositories.filter((r) => r.name === name)
      : fileRepositories;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(FILE_REPO_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      remote?: string;
      autopublish?: boolean;
      manifest?: string;
    };
    const id = freshId();
    const repo = {
      pulp_href: `${FILE_REPO_BASE}${id}/`,
      name: body.name,
      description: body.description ?? null,
      remote: body.remote ?? null,
      autopublish: body.autopublish ?? false,
      manifest: body.manifest ?? null,
      versions_href: `${FILE_REPO_BASE}${id}/versions/`,
      latest_version_href: `${FILE_REPO_BASE}${id}/versions/0/`,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    fileRepositories = [...fileRepositories, repo];
    return HttpResponse.json(repo, { status: 201 });
  }),
  http.get(`${FILE_REPO_BASE}:id/`, ({ params }) => {
    const href = `${FILE_REPO_BASE}${params.id}/`;
    const repo = fileRepositories.find((r) => r.pulp_href === href);
    if (!repo) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(repo);
  }),
  http.delete(`${FILE_REPO_BASE}:id/`, ({ params }) => {
    const href = `${FILE_REPO_BASE}${params.id}/`;
    fileRepositories = fileRepositories.filter((r) => r.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask(`Delete repository`) },
      { status: 202 },
    );
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${FILE_REPO_BASE}:id/`, async ({ params, request }) => {
    const href = `${FILE_REPO_BASE}${params.id}/`;
    const body = (await request.json()) as Partial<FileRepository>;
    fileRepositories = fileRepositories.map((r) =>
      r.pulp_href === href ? { ...r, ...body } : r,
    );
    return HttpResponse.json(
      { task: registerTask("Update repository") },
      { status: 202 },
    );
  }),
  http.post(`${FILE_REPO_BASE}:id/sync/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Sync repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.post(`${FILE_REPO_BASE}:id/modify/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Modify repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.get(`${FILE_REPO_BASE}:id/versions/`, ({ params }) => {
    const results = FILE_VERSION_FIXTURES.filter(
      (v) => v.repository === `${FILE_REPO_BASE}${params.id}/`,
    );
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),

  // Remotes
  http.get(FILE_REMOTE_BASE, () =>
    HttpResponse.json({
      count: fileRemotes.length,
      next: null,
      previous: null,
      results: fileRemotes,
    }),
  ),
  http.post(FILE_REMOTE_BASE, async ({ request }) => {
    const body = (await request.json()) as FileRemoteCreate;
    const remote: FileRemote = {
      pulp_href: `${FILE_REMOTE_BASE}${freshId()}/`,
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
    fileRemotes = [...fileRemotes, remote];
    return HttpResponse.json(remote, { status: 201 });
  }),
  http.delete(`${FILE_REMOTE_BASE}:id/`, ({ params }) => {
    const href = `${FILE_REMOTE_BASE}${params.id}/`;
    fileRemotes = fileRemotes.filter((r) => r.pulp_href !== href);
    return HttpResponse.json({ task: registerTask("Delete remote") }, { status: 202 });
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${FILE_REMOTE_BASE}:id/`, async ({ params, request }) => {
    const href = `${FILE_REMOTE_BASE}${params.id}/`;
    const body = (await request.json()) as FileRemoteUpdate;
    fileRemotes = fileRemotes.map((r) => {
      if (r.pulp_href !== href) {
        return r;
      }
      const hiddenFields = r.hidden_fields.map((f) =>
        f.name in body && body[f.name as keyof FileRemoteUpdate]
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

  // Git remotes - a second, separate remote collection (VERIFIED live).
  http.get(FILE_GIT_REMOTE_BASE, () =>
    HttpResponse.json({
      count: fileGitRemotes.length,
      next: null,
      previous: null,
      results: fileGitRemotes,
    }),
  ),
  http.post(FILE_GIT_REMOTE_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      url: string;
      git_ref?: string;
      proxy_url?: string;
      tls_validation?: boolean;
      ca_cert?: string;
      proxy_username?: string;
      proxy_password?: string;
      username?: string;
      password?: string;
    };
    const remote: FileGitRemote = {
      pulp_href: `${FILE_GIT_REMOTE_BASE}${freshId()}/`,
      name: body.name,
      url: body.url,
      git_ref: body.git_ref ?? "HEAD",
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
    fileGitRemotes = [...fileGitRemotes, remote];
    return HttpResponse.json(remote, { status: 201 });
  }),
  http.delete(`${FILE_GIT_REMOTE_BASE}:id/`, ({ params }) => {
    const href = `${FILE_GIT_REMOTE_BASE}${params.id}/`;
    fileGitRemotes = fileGitRemotes.filter((r) => r.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete Git remote") },
      { status: 202 },
    );
  }),
  // VERIFIED live: unlike RPM's ULN remote, the git flavor here supports
  // PATCH too (async, 202 + task).
  http.patch(`${FILE_GIT_REMOTE_BASE}:id/`, async ({ params, request }) => {
    const href = `${FILE_GIT_REMOTE_BASE}${params.id}/`;
    const body = (await request.json()) as Partial<FileGitRemote>;
    fileGitRemotes = fileGitRemotes.map((r) =>
      r.pulp_href === href ? { ...r, ...body } : r,
    );
    return HttpResponse.json(
      { task: registerTask("Update Git remote") },
      { status: 202 },
    );
  }),

  // Distributions
  http.get(FILE_DIST_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repository = url.searchParams.get("repository");
    const results = repository
      ? fileDistributions.filter((d) => d.repository === repository)
      : fileDistributions;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(FILE_DIST_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      base_path: string;
      repository?: string;
    };
    const id = freshId();
    const distribution = {
      pulp_href: `${FILE_DIST_BASE}${id}/`,
      name: body.name,
      base_path: body.base_path,
      base_url: `https://pulp.example.com/pulp/content/${body.base_path}/`,
      repository: body.repository ?? null,
      publication: null,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    const task = registerTask(`Create distribution "${body.name}"`);
    fileDistributions = [...fileDistributions, distribution];
    return HttpResponse.json({ task }, { status: 202 });
  }),
  http.delete(`${FILE_DIST_BASE}:id/`, ({ params }) => {
    const href = `${FILE_DIST_BASE}${params.id}/`;
    fileDistributions = fileDistributions.filter((d) => d.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete distribution") },
      { status: 202 },
    );
  }),

  // Content
  http.get(FILE_CONTENT_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repositoryVersion = url.searchParams.get("repository_version");
    const results = repositoryVersion ? [] : fileContent;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(`${FILE_CONTENT_BASE}upload/`, async ({ request }) => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return HttpResponse.json({ detail: "expected multipart upload" }, { status: 400 });
    }
    const content = {
      ...FILE_CONTENT_FIXTURE,
      pulp_href: `${FILE_CONTENT_BASE}${freshId()}/`,
    };
    fileContent = [...fileContent, content];
    return HttpResponse.json(content, { status: 201 });
  }),

  // Publications
  http.post(FILE_PUBLICATIONS_BASE, () =>
    HttpResponse.json({ task: registerTask("Publish repository") }, { status: 202 }),
  ),
];

// ---------------------------------------------------------------------------
// Hugging Face fixtures - shapes VERIFIED against the live OpenAPI schema of
// a pulpcore 3.116.1 instance with pulp_hugging_face 0.3.2 installed
// (component=hugging_face - docs/PULP_API.md, the pulp-api skill),
// mirroring the RPM/File in-memory mutable store pattern above. Only one
// remote "flavor" for this plugin (no Standard/Git-style toggle needed),
// and no `autopublish` field at all - publishing is always a manual step.
const HF_REPO_BASE = "/pulp/api/v3/repositories/hugging_face/hugging-face/";
const HF_REMOTE_BASE = "/pulp/api/v3/remotes/hugging_face/hugging-face/";
const HF_DIST_BASE = "/pulp/api/v3/distributions/hugging_face/hugging-face/";
const HF_CONTENT_BASE = "/pulp/api/v3/content/hugging_face/hugging-face/";
const HF_PUBLICATIONS_BASE = "/pulp/api/v3/publications/hugging_face/hugging-face/";

export const HF_REMOTE_FIXTURE: HuggingFaceRemote = {
  pulp_href: `${HF_REMOTE_BASE}remote-1/`,
  name: "test-hf-fixture",
  url: "https://huggingface.co/bert-base-uncased",
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

export const HF_REPO_FIXTURE = {
  pulp_href: `${HF_REPO_BASE}repo-1/`,
  name: "test-hf-repo",
  description: "A test Hugging Face repository",
  remote: HF_REMOTE_FIXTURE.pulp_href,
  versions_href: `${HF_REPO_BASE}repo-1/versions/`,
  latest_version_href: `${HF_REPO_BASE}repo-1/versions/1/`,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

export const HF_VERSION_FIXTURES = [
  {
    pulp_href: `${HF_REPO_BASE}repo-1/versions/1/`,
    number: 1,
    repository: HF_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:05:00.000000Z",
    content_summary: {
      added: {
        "hugging_face.hugging-face": {
          count: 3,
          href: `${HF_REPO_BASE}repo-1/versions/1/`,
        },
      },
      removed: {},
      present: {
        "hugging_face.hugging-face": {
          count: 3,
          href: `${HF_REPO_BASE}repo-1/versions/1/`,
        },
      },
    },
  },
  {
    pulp_href: `${HF_REPO_BASE}repo-1/versions/0/`,
    number: 0,
    repository: HF_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:00:00.000000Z",
    content_summary: { added: {}, removed: {}, present: {} },
  },
];

export const HF_CONTENT_FIXTURE: HuggingFaceContent = {
  pulp_href: `${HF_CONTENT_BASE}content-1/`,
  relative_path: "config.json",
  repo_id: "bert-base-uncased",
  repo_type: "model",
};

export const HF_DISTRIBUTION_FIXTURE = {
  pulp_href: `${HF_DIST_BASE}dist-1/`,
  name: "existing-hf-dist",
  base_path: "existing-hf-dist-path",
  base_url: "https://pulp.example.com/pulp/content/existing-hf-dist-path/",
  repository: HF_REPO_FIXTURE.pulp_href,
  publication: null,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

function seedHfRepositories(): HuggingFaceRepository[] {
  return [{ ...HF_REPO_FIXTURE }];
}
function seedHfRemotes(): HuggingFaceRemote[] {
  return [{ ...HF_REMOTE_FIXTURE }];
}
function seedHfDistributions(): HuggingFaceDistribution[] {
  return [{ ...HF_DISTRIBUTION_FIXTURE }];
}
function seedHfContent(): HuggingFaceContent[] {
  return [{ ...HF_CONTENT_FIXTURE }];
}

let hfRepositories = seedHfRepositories();
let hfRemotes = seedHfRemotes();
let hfDistributions = seedHfDistributions();
let hfContent = seedHfContent();

/** Restores every Hugging Face in-memory fixture store to its initial seed - call from `afterEach`. */
export function resetHuggingFaceFixtures() {
  hfRepositories = seedHfRepositories();
  hfRemotes = seedHfRemotes();
  hfDistributions = seedHfDistributions();
  hfContent = seedHfContent();
}

const huggingFaceHandlers = [
  // Repositories
  http.get(HF_REPO_BASE, ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const results = name ? hfRepositories.filter((r) => r.name === name) : hfRepositories;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(HF_REPO_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      remote?: string;
    };
    const id = freshId();
    const repo = {
      pulp_href: `${HF_REPO_BASE}${id}/`,
      name: body.name,
      description: body.description ?? null,
      remote: body.remote ?? null,
      versions_href: `${HF_REPO_BASE}${id}/versions/`,
      latest_version_href: `${HF_REPO_BASE}${id}/versions/0/`,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    hfRepositories = [...hfRepositories, repo];
    return HttpResponse.json(repo, { status: 201 });
  }),
  http.get(`${HF_REPO_BASE}:id/`, ({ params }) => {
    const href = `${HF_REPO_BASE}${params.id}/`;
    const repo = hfRepositories.find((r) => r.pulp_href === href);
    if (!repo) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(repo);
  }),
  http.delete(`${HF_REPO_BASE}:id/`, ({ params }) => {
    const href = `${HF_REPO_BASE}${params.id}/`;
    hfRepositories = hfRepositories.filter((r) => r.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask(`Delete repository`) },
      { status: 202 },
    );
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${HF_REPO_BASE}:id/`, async ({ params, request }) => {
    const href = `${HF_REPO_BASE}${params.id}/`;
    const body = (await request.json()) as Partial<HuggingFaceRepository>;
    hfRepositories = hfRepositories.map((r) =>
      r.pulp_href === href ? { ...r, ...body } : r,
    );
    return HttpResponse.json(
      { task: registerTask("Update repository") },
      { status: 202 },
    );
  }),
  http.post(`${HF_REPO_BASE}:id/sync/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Sync repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.post(`${HF_REPO_BASE}:id/modify/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Modify repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.get(`${HF_REPO_BASE}:id/versions/`, ({ params }) => {
    const results = HF_VERSION_FIXTURES.filter(
      (v) => v.repository === `${HF_REPO_BASE}${params.id}/`,
    );
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),

  // Remotes
  http.get(HF_REMOTE_BASE, () =>
    HttpResponse.json({
      count: hfRemotes.length,
      next: null,
      previous: null,
      results: hfRemotes,
    }),
  ),
  http.post(HF_REMOTE_BASE, async ({ request }) => {
    const body = (await request.json()) as HuggingFaceRemoteCreate;
    const remote: HuggingFaceRemote = {
      pulp_href: `${HF_REMOTE_BASE}${freshId()}/`,
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
    hfRemotes = [...hfRemotes, remote];
    return HttpResponse.json(remote, { status: 201 });
  }),
  http.delete(`${HF_REMOTE_BASE}:id/`, ({ params }) => {
    const href = `${HF_REMOTE_BASE}${params.id}/`;
    hfRemotes = hfRemotes.filter((r) => r.pulp_href !== href);
    return HttpResponse.json({ task: registerTask("Delete remote") }, { status: 202 });
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${HF_REMOTE_BASE}:id/`, async ({ params, request }) => {
    const href = `${HF_REMOTE_BASE}${params.id}/`;
    const body = (await request.json()) as HuggingFaceRemoteUpdate;
    hfRemotes = hfRemotes.map((r) => {
      if (r.pulp_href !== href) {
        return r;
      }
      const hiddenFields = r.hidden_fields.map((f) =>
        f.name in body && body[f.name as keyof HuggingFaceRemoteUpdate]
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

  // Distributions
  http.get(HF_DIST_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repository = url.searchParams.get("repository");
    const results = repository
      ? hfDistributions.filter((d) => d.repository === repository)
      : hfDistributions;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(HF_DIST_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      base_path: string;
      repository?: string;
    };
    const id = freshId();
    const distribution = {
      pulp_href: `${HF_DIST_BASE}${id}/`,
      name: body.name,
      base_path: body.base_path,
      base_url: `https://pulp.example.com/pulp/content/${body.base_path}/`,
      repository: body.repository ?? null,
      publication: null,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    const task = registerTask(`Create distribution "${body.name}"`);
    hfDistributions = [...hfDistributions, distribution];
    return HttpResponse.json({ task }, { status: 202 });
  }),
  http.delete(`${HF_DIST_BASE}:id/`, ({ params }) => {
    const href = `${HF_DIST_BASE}${params.id}/`;
    hfDistributions = hfDistributions.filter((d) => d.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete distribution") },
      { status: 202 },
    );
  }),

  // Content
  http.get(HF_CONTENT_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repositoryVersion = url.searchParams.get("repository_version");
    const results = repositoryVersion ? [] : hfContent;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(HF_CONTENT_BASE, async ({ request }) => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return HttpResponse.json({ detail: "expected multipart upload" }, { status: 400 });
    }
    const content = {
      ...HF_CONTENT_FIXTURE,
      pulp_href: `${HF_CONTENT_BASE}${freshId()}/`,
    };
    hfContent = [...hfContent, content];
    return HttpResponse.json(content, { status: 201 });
  }),

  // Publications
  http.post(HF_PUBLICATIONS_BASE, () =>
    HttpResponse.json({ task: registerTask("Publish repository") }, { status: 202 }),
  ),
];

// ---------------------------------------------------------------------------
// Gem fixtures - shapes VERIFIED against the live OpenAPI schema of a
// pulpcore 3.116.1 instance with pulp_gem 0.8.0 installed (component=gem -
// docs/PULP_API.md, the pulp-api skill), mirroring the Hugging Face
// in-memory mutable store pattern above. Only one remote "flavor" for this
// plugin, and no `autopublish` field at all - publishing is always a manual
// step. Unlike Hugging Face/File, content has no `relative_path` - a gem's
// identity (name/version/platform) is parsed server-side from the uploaded
// file's own embedded metadata.
const GEM_REPO_BASE = "/pulp/api/v3/repositories/gem/gem/";
const GEM_REMOTE_BASE = "/pulp/api/v3/remotes/gem/gem/";
const GEM_DIST_BASE = "/pulp/api/v3/distributions/gem/gem/";
const GEM_CONTENT_BASE = "/pulp/api/v3/content/gem/gem/";
const GEM_PUBLICATIONS_BASE = "/pulp/api/v3/publications/gem/gem/";

export const GEM_REMOTE_FIXTURE: GemRemote = {
  pulp_href: `${GEM_REMOTE_BASE}remote-1/`,
  name: "test-gem-fixture",
  url: "https://rubygems.org",
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

export const GEM_REPO_FIXTURE = {
  pulp_href: `${GEM_REPO_BASE}repo-1/`,
  name: "test-gem-repo",
  description: "A test Gem repository",
  remote: GEM_REMOTE_FIXTURE.pulp_href,
  versions_href: `${GEM_REPO_BASE}repo-1/versions/`,
  latest_version_href: `${GEM_REPO_BASE}repo-1/versions/1/`,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

export const GEM_VERSION_FIXTURES = [
  {
    pulp_href: `${GEM_REPO_BASE}repo-1/versions/1/`,
    number: 1,
    repository: GEM_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:05:00.000000Z",
    content_summary: {
      added: {
        "gem.gem": { count: 3, href: `${GEM_REPO_BASE}repo-1/versions/1/` },
      },
      removed: {},
      present: {
        "gem.gem": { count: 3, href: `${GEM_REPO_BASE}repo-1/versions/1/` },
      },
    },
  },
  {
    pulp_href: `${GEM_REPO_BASE}repo-1/versions/0/`,
    number: 0,
    repository: GEM_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:00:00.000000Z",
    content_summary: { added: {}, removed: {}, present: {} },
  },
];

export const GEM_CONTENT_FIXTURE: GemContent = {
  pulp_href: `${GEM_CONTENT_BASE}content-1/`,
  name: "rails",
  version: "7.1.0",
  platform: "ruby",
};

export const GEM_DISTRIBUTION_FIXTURE = {
  pulp_href: `${GEM_DIST_BASE}dist-1/`,
  name: "existing-gem-dist",
  base_path: "existing-gem-dist-path",
  base_url: "https://pulp.example.com/pulp/content/existing-gem-dist-path/",
  repository: GEM_REPO_FIXTURE.pulp_href,
  publication: null,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

function seedGemRepositories(): GemRepository[] {
  return [{ ...GEM_REPO_FIXTURE }];
}
function seedGemRemotes(): GemRemote[] {
  return [{ ...GEM_REMOTE_FIXTURE }];
}
function seedGemDistributions(): GemDistribution[] {
  return [{ ...GEM_DISTRIBUTION_FIXTURE }];
}
function seedGemContent(): GemContent[] {
  return [{ ...GEM_CONTENT_FIXTURE }];
}

let gemRepositories = seedGemRepositories();
let gemRemotes = seedGemRemotes();
let gemDistributions = seedGemDistributions();
let gemContent = seedGemContent();

/** Restores every Gem in-memory fixture store to its initial seed - call from `afterEach`. */
export function resetGemFixtures() {
  gemRepositories = seedGemRepositories();
  gemRemotes = seedGemRemotes();
  gemDistributions = seedGemDistributions();
  gemContent = seedGemContent();
}

const gemHandlers = [
  // Repositories
  http.get(GEM_REPO_BASE, ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const results = name
      ? gemRepositories.filter((r) => r.name === name)
      : gemRepositories;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(GEM_REPO_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      remote?: string;
    };
    const id = freshId();
    const repo = {
      pulp_href: `${GEM_REPO_BASE}${id}/`,
      name: body.name,
      description: body.description ?? null,
      remote: body.remote ?? null,
      versions_href: `${GEM_REPO_BASE}${id}/versions/`,
      latest_version_href: `${GEM_REPO_BASE}${id}/versions/0/`,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    gemRepositories = [...gemRepositories, repo];
    return HttpResponse.json(repo, { status: 201 });
  }),
  http.get(`${GEM_REPO_BASE}:id/`, ({ params }) => {
    const href = `${GEM_REPO_BASE}${params.id}/`;
    const repo = gemRepositories.find((r) => r.pulp_href === href);
    if (!repo) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(repo);
  }),
  http.delete(`${GEM_REPO_BASE}:id/`, ({ params }) => {
    const href = `${GEM_REPO_BASE}${params.id}/`;
    gemRepositories = gemRepositories.filter((r) => r.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask(`Delete repository`) },
      { status: 202 },
    );
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${GEM_REPO_BASE}:id/`, async ({ params, request }) => {
    const href = `${GEM_REPO_BASE}${params.id}/`;
    const body = (await request.json()) as Partial<GemRepository>;
    gemRepositories = gemRepositories.map((r) =>
      r.pulp_href === href ? { ...r, ...body } : r,
    );
    return HttpResponse.json(
      { task: registerTask("Update repository") },
      { status: 202 },
    );
  }),
  http.post(`${GEM_REPO_BASE}:id/sync/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Sync repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.post(`${GEM_REPO_BASE}:id/modify/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Modify repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.get(`${GEM_REPO_BASE}:id/versions/`, ({ params }) => {
    const results = GEM_VERSION_FIXTURES.filter(
      (v) => v.repository === `${GEM_REPO_BASE}${params.id}/`,
    );
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),

  // Remotes
  http.get(GEM_REMOTE_BASE, () =>
    HttpResponse.json({
      count: gemRemotes.length,
      next: null,
      previous: null,
      results: gemRemotes,
    }),
  ),
  http.post(GEM_REMOTE_BASE, async ({ request }) => {
    const body = (await request.json()) as GemRemoteCreate;
    const remote: GemRemote = {
      pulp_href: `${GEM_REMOTE_BASE}${freshId()}/`,
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
    gemRemotes = [...gemRemotes, remote];
    return HttpResponse.json(remote, { status: 201 });
  }),
  http.delete(`${GEM_REMOTE_BASE}:id/`, ({ params }) => {
    const href = `${GEM_REMOTE_BASE}${params.id}/`;
    gemRemotes = gemRemotes.filter((r) => r.pulp_href !== href);
    return HttpResponse.json({ task: registerTask("Delete remote") }, { status: 202 });
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${GEM_REMOTE_BASE}:id/`, async ({ params, request }) => {
    const href = `${GEM_REMOTE_BASE}${params.id}/`;
    const body = (await request.json()) as GemRemoteUpdate;
    gemRemotes = gemRemotes.map((r) => {
      if (r.pulp_href !== href) {
        return r;
      }
      const hiddenFields = r.hidden_fields.map((f) =>
        f.name in body && body[f.name as keyof GemRemoteUpdate]
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

  // Distributions
  http.get(GEM_DIST_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repository = url.searchParams.get("repository");
    const results = repository
      ? gemDistributions.filter((d) => d.repository === repository)
      : gemDistributions;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(GEM_DIST_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      base_path: string;
      repository?: string;
    };
    const id = freshId();
    const distribution = {
      pulp_href: `${GEM_DIST_BASE}${id}/`,
      name: body.name,
      base_path: body.base_path,
      base_url: `https://pulp.example.com/pulp/content/${body.base_path}/`,
      repository: body.repository ?? null,
      publication: null,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    const task = registerTask(`Create distribution "${body.name}"`);
    gemDistributions = [...gemDistributions, distribution];
    return HttpResponse.json({ task }, { status: 202 });
  }),
  http.delete(`${GEM_DIST_BASE}:id/`, ({ params }) => {
    const href = `${GEM_DIST_BASE}${params.id}/`;
    gemDistributions = gemDistributions.filter((d) => d.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete distribution") },
      { status: 202 },
    );
  }),

  // Content
  http.get(GEM_CONTENT_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repositoryVersion = url.searchParams.get("repository_version");
    const results = repositoryVersion ? [] : gemContent;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(GEM_CONTENT_BASE, async ({ request }) => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return HttpResponse.json({ detail: "expected multipart upload" }, { status: 400 });
    }
    const content = {
      ...GEM_CONTENT_FIXTURE,
      pulp_href: `${GEM_CONTENT_BASE}${freshId()}/`,
    };
    gemContent = [...gemContent, content];
    return HttpResponse.json(content, { status: 201 });
  }),

  // Publications
  http.post(GEM_PUBLICATIONS_BASE, () =>
    HttpResponse.json({ task: registerTask("Publish repository") }, { status: 202 }),
  ),
];

// ---------------------------------------------------------------------------
// Maven fixtures - shapes VERIFIED against the live OpenAPI schema of a
// pulpcore 3.116.1 instance with pulp_maven 0.25.1 installed
// (component=maven - docs/PULP_API.md, the pulp-api skill). Structurally
// different from every other plugin above: no `remote` field or `sync/`
// action on Repository, no publication endpoint at all, and content upload
// is itself asynchronous (202 + task) with an optional `repository` field
// baked directly into the same call - see uploadMavenContent's own comment.
const MAVEN_REPO_BASE = "/pulp/api/v3/repositories/maven/maven/";
const MAVEN_REMOTE_BASE = "/pulp/api/v3/remotes/maven/maven/";
const MAVEN_DIST_BASE = "/pulp/api/v3/distributions/maven/maven/";
const MAVEN_CONTENT_BASE = "/pulp/api/v3/content/maven/artifact/";

export const MAVEN_REMOTE_FIXTURE: MavenRemote = {
  pulp_href: `${MAVEN_REMOTE_BASE}remote-1/`,
  name: "test-maven-fixture",
  url: "https://repo1.maven.org/maven2/",
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

export const MAVEN_REPO_FIXTURE = {
  pulp_href: `${MAVEN_REPO_BASE}repo-1/`,
  name: "test-maven-repo",
  description: "A test Maven repository",
  versions_href: `${MAVEN_REPO_BASE}repo-1/versions/`,
  latest_version_href: `${MAVEN_REPO_BASE}repo-1/versions/1/`,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

export const MAVEN_VERSION_FIXTURES = [
  {
    pulp_href: `${MAVEN_REPO_BASE}repo-1/versions/1/`,
    number: 1,
    repository: MAVEN_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:05:00.000000Z",
    content_summary: {
      added: {
        "maven.artifact": { count: 3, href: `${MAVEN_REPO_BASE}repo-1/versions/1/` },
      },
      removed: {},
      present: {
        "maven.artifact": { count: 3, href: `${MAVEN_REPO_BASE}repo-1/versions/1/` },
      },
    },
  },
  {
    pulp_href: `${MAVEN_REPO_BASE}repo-1/versions/0/`,
    number: 0,
    repository: MAVEN_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:00:00.000000Z",
    content_summary: { added: {}, removed: {}, present: {} },
  },
];

export const MAVEN_CONTENT_FIXTURE: MavenContent = {
  pulp_href: `${MAVEN_CONTENT_BASE}content-1/`,
  group_id: "com.example",
  artifact_id: "my-lib",
  version: "1.0",
  filename: "my-lib-1.0.jar",
};

export const MAVEN_DISTRIBUTION_FIXTURE = {
  pulp_href: `${MAVEN_DIST_BASE}dist-1/`,
  name: "existing-maven-dist",
  base_path: "existing-maven-dist-path",
  base_url: "https://pulp.example.com/pulp/content/existing-maven-dist-path/",
  repository: MAVEN_REPO_FIXTURE.pulp_href,
  remote: null,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

function seedMavenRepositories(): MavenRepository[] {
  return [{ ...MAVEN_REPO_FIXTURE }];
}
function seedMavenRemotes(): MavenRemote[] {
  return [{ ...MAVEN_REMOTE_FIXTURE }];
}
function seedMavenDistributions(): MavenDistribution[] {
  return [{ ...MAVEN_DISTRIBUTION_FIXTURE }];
}
function seedMavenContent(): MavenContent[] {
  return [{ ...MAVEN_CONTENT_FIXTURE }];
}

let mavenRepositories = seedMavenRepositories();
let mavenRemotes = seedMavenRemotes();
let mavenDistributions = seedMavenDistributions();
let mavenContent = seedMavenContent();

/** Restores every Maven in-memory fixture store to its initial seed - call from `afterEach`. */
export function resetMavenFixtures() {
  mavenRepositories = seedMavenRepositories();
  mavenRemotes = seedMavenRemotes();
  mavenDistributions = seedMavenDistributions();
  mavenContent = seedMavenContent();
}

const mavenHandlers = [
  // Repositories
  http.get(MAVEN_REPO_BASE, ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const results = name
      ? mavenRepositories.filter((r) => r.name === name)
      : mavenRepositories;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(MAVEN_REPO_BASE, async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string };
    const id = freshId();
    const repo = {
      pulp_href: `${MAVEN_REPO_BASE}${id}/`,
      name: body.name,
      description: body.description ?? null,
      versions_href: `${MAVEN_REPO_BASE}${id}/versions/`,
      latest_version_href: `${MAVEN_REPO_BASE}${id}/versions/0/`,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    mavenRepositories = [...mavenRepositories, repo];
    return HttpResponse.json(repo, { status: 201 });
  }),
  http.get(`${MAVEN_REPO_BASE}:id/`, ({ params }) => {
    const href = `${MAVEN_REPO_BASE}${params.id}/`;
    const repo = mavenRepositories.find((r) => r.pulp_href === href);
    if (!repo) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(repo);
  }),
  http.delete(`${MAVEN_REPO_BASE}:id/`, ({ params }) => {
    const href = `${MAVEN_REPO_BASE}${params.id}/`;
    mavenRepositories = mavenRepositories.filter((r) => r.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask(`Delete repository`) },
      { status: 202 },
    );
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${MAVEN_REPO_BASE}:id/`, async ({ params, request }) => {
    const href = `${MAVEN_REPO_BASE}${params.id}/`;
    const body = (await request.json()) as Partial<MavenRepository>;
    mavenRepositories = mavenRepositories.map((r) =>
      r.pulp_href === href ? { ...r, ...body } : r,
    );
    return HttpResponse.json(
      { task: registerTask("Update repository") },
      { status: 202 },
    );
  }),
  http.post(`${MAVEN_REPO_BASE}:id/modify/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Modify repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.get(`${MAVEN_REPO_BASE}:id/versions/`, ({ params }) => {
    const results = MAVEN_VERSION_FIXTURES.filter(
      (v) => v.repository === `${MAVEN_REPO_BASE}${params.id}/`,
    );
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),

  // Remotes
  http.get(MAVEN_REMOTE_BASE, () =>
    HttpResponse.json({
      count: mavenRemotes.length,
      next: null,
      previous: null,
      results: mavenRemotes,
    }),
  ),
  http.post(MAVEN_REMOTE_BASE, async ({ request }) => {
    const body = (await request.json()) as MavenRemoteCreate;
    const remote: MavenRemote = {
      pulp_href: `${MAVEN_REMOTE_BASE}${freshId()}/`,
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
    mavenRemotes = [...mavenRemotes, remote];
    return HttpResponse.json(remote, { status: 201 });
  }),
  http.delete(`${MAVEN_REMOTE_BASE}:id/`, ({ params }) => {
    const href = `${MAVEN_REMOTE_BASE}${params.id}/`;
    mavenRemotes = mavenRemotes.filter((r) => r.pulp_href !== href);
    return HttpResponse.json({ task: registerTask("Delete remote") }, { status: 202 });
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${MAVEN_REMOTE_BASE}:id/`, async ({ params, request }) => {
    const href = `${MAVEN_REMOTE_BASE}${params.id}/`;
    const body = (await request.json()) as MavenRemoteUpdate;
    mavenRemotes = mavenRemotes.map((r) => {
      if (r.pulp_href !== href) {
        return r;
      }
      const hiddenFields = r.hidden_fields.map((f) =>
        f.name in body && body[f.name as keyof MavenRemoteUpdate]
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

  // Distributions
  http.get(MAVEN_DIST_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repository = url.searchParams.get("repository");
    const results = repository
      ? mavenDistributions.filter((d) => d.repository === repository)
      : mavenDistributions;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(MAVEN_DIST_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      base_path: string;
      repository?: string;
      remote?: string;
    };
    const id = freshId();
    const distribution = {
      pulp_href: `${MAVEN_DIST_BASE}${id}/`,
      name: body.name,
      base_path: body.base_path,
      base_url: `https://pulp.example.com/pulp/content/${body.base_path}/`,
      repository: body.repository ?? null,
      remote: body.remote ?? null,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    const task = registerTask(`Create distribution "${body.name}"`);
    mavenDistributions = [...mavenDistributions, distribution];
    return HttpResponse.json({ task }, { status: 202 });
  }),
  http.delete(`${MAVEN_DIST_BASE}:id/`, ({ params }) => {
    const href = `${MAVEN_DIST_BASE}${params.id}/`;
    mavenDistributions = mavenDistributions.filter((d) => d.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete distribution") },
      { status: 202 },
    );
  }),

  // Content - VERIFIED live: unlike every other plugin above, this upload
  // is itself asynchronous (202 + task), not a sync 201 returning the
  // created content object.
  http.get(MAVEN_CONTENT_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repositoryVersion = url.searchParams.get("repository_version");
    const results = repositoryVersion ? [] : mavenContent;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(MAVEN_CONTENT_BASE, async ({ request }) => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return HttpResponse.json({ detail: "expected multipart upload" }, { status: 400 });
    }
    const formData = await request.formData();
    const relativePath = formData.get("relative_path");
    const content = {
      ...MAVEN_CONTENT_FIXTURE,
      pulp_href: `${MAVEN_CONTENT_BASE}${freshId()}/`,
      filename:
        typeof relativePath === "string" ? relativePath : MAVEN_CONTENT_FIXTURE.filename,
    };
    mavenContent = [...mavenContent, content];
    return HttpResponse.json(
      { task: registerTask("Add artifact to repository") },
      { status: 202 },
    );
  }),
];

// ---------------------------------------------------------------------------
// npm fixtures - shapes VERIFIED against the live OpenAPI schema of a
// pulpcore 3.116.1 instance with pulp_npm 0.10.1 installed (component=npm -
// docs/PULP_API.md, the pulp-api skill). Unlike maven, this plugin's
// Repository DOES have a `remote` field and a `sync/` action - but like
// maven, there is no publication endpoint at all, and content upload is
// itself asynchronous (202 + task) with an optional `repository` field
// baked directly into the same call.
const NPM_REPO_BASE = "/pulp/api/v3/repositories/npm/npm/";
const NPM_REMOTE_BASE = "/pulp/api/v3/remotes/npm/npm/";
const NPM_DIST_BASE = "/pulp/api/v3/distributions/npm/npm/";
const NPM_CONTENT_BASE = "/pulp/api/v3/content/npm/packages/";

export const NPM_REMOTE_FIXTURE: NpmRemote = {
  pulp_href: `${NPM_REMOTE_BASE}remote-1/`,
  name: "test-npm-fixture",
  url: "https://registry.npmjs.org",
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

export const NPM_REPO_FIXTURE = {
  pulp_href: `${NPM_REPO_BASE}repo-1/`,
  name: "test-npm-repo",
  description: "A test npm repository",
  remote: NPM_REMOTE_FIXTURE.pulp_href,
  versions_href: `${NPM_REPO_BASE}repo-1/versions/`,
  latest_version_href: `${NPM_REPO_BASE}repo-1/versions/1/`,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

export const NPM_VERSION_FIXTURES = [
  {
    pulp_href: `${NPM_REPO_BASE}repo-1/versions/1/`,
    number: 1,
    repository: NPM_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:05:00.000000Z",
    content_summary: {
      added: {
        "npm.package": { count: 3, href: `${NPM_REPO_BASE}repo-1/versions/1/` },
      },
      removed: {},
      present: {
        "npm.package": { count: 3, href: `${NPM_REPO_BASE}repo-1/versions/1/` },
      },
    },
  },
  {
    pulp_href: `${NPM_REPO_BASE}repo-1/versions/0/`,
    number: 0,
    repository: NPM_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:00:00.000000Z",
    content_summary: { added: {}, removed: {}, present: {} },
  },
];

export const NPM_CONTENT_FIXTURE: NpmContent = {
  pulp_href: `${NPM_CONTENT_BASE}content-1/`,
  relative_path: "my-package-1.0.0.tgz",
  name: "my-package",
  version: "1.0.0",
};

export const NPM_DISTRIBUTION_FIXTURE = {
  pulp_href: `${NPM_DIST_BASE}dist-1/`,
  name: "existing-npm-dist",
  base_path: "existing-npm-dist-path",
  base_url: "https://pulp.example.com/pulp/content/existing-npm-dist-path/",
  repository: NPM_REPO_FIXTURE.pulp_href,
  remote: null,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

function seedNpmRepositories(): NpmRepository[] {
  return [{ ...NPM_REPO_FIXTURE }];
}
function seedNpmRemotes(): NpmRemote[] {
  return [{ ...NPM_REMOTE_FIXTURE }];
}
function seedNpmDistributions(): NpmDistribution[] {
  return [{ ...NPM_DISTRIBUTION_FIXTURE }];
}
function seedNpmContent(): NpmContent[] {
  return [{ ...NPM_CONTENT_FIXTURE }];
}

let npmRepositories = seedNpmRepositories();
let npmRemotes = seedNpmRemotes();
let npmDistributions = seedNpmDistributions();
let npmContent = seedNpmContent();

/** Restores every npm in-memory fixture store to its initial seed - call from `afterEach`. */
export function resetNpmFixtures() {
  npmRepositories = seedNpmRepositories();
  npmRemotes = seedNpmRemotes();
  npmDistributions = seedNpmDistributions();
  npmContent = seedNpmContent();
}

const npmHandlers = [
  // Repositories
  http.get(NPM_REPO_BASE, ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const results = name
      ? npmRepositories.filter((r) => r.name === name)
      : npmRepositories;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(NPM_REPO_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      remote?: string;
    };
    const id = freshId();
    const repo = {
      pulp_href: `${NPM_REPO_BASE}${id}/`,
      name: body.name,
      description: body.description ?? null,
      remote: body.remote ?? null,
      versions_href: `${NPM_REPO_BASE}${id}/versions/`,
      latest_version_href: `${NPM_REPO_BASE}${id}/versions/0/`,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    npmRepositories = [...npmRepositories, repo];
    return HttpResponse.json(repo, { status: 201 });
  }),
  http.get(`${NPM_REPO_BASE}:id/`, ({ params }) => {
    const href = `${NPM_REPO_BASE}${params.id}/`;
    const repo = npmRepositories.find((r) => r.pulp_href === href);
    if (!repo) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(repo);
  }),
  http.delete(`${NPM_REPO_BASE}:id/`, ({ params }) => {
    const href = `${NPM_REPO_BASE}${params.id}/`;
    npmRepositories = npmRepositories.filter((r) => r.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask(`Delete repository`) },
      { status: 202 },
    );
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${NPM_REPO_BASE}:id/`, async ({ params, request }) => {
    const href = `${NPM_REPO_BASE}${params.id}/`;
    const body = (await request.json()) as Partial<NpmRepository>;
    npmRepositories = npmRepositories.map((r) =>
      r.pulp_href === href ? { ...r, ...body } : r,
    );
    return HttpResponse.json(
      { task: registerTask("Update repository") },
      { status: 202 },
    );
  }),
  http.post(`${NPM_REPO_BASE}:id/sync/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Sync repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.get(`${NPM_REPO_BASE}:id/versions/`, ({ params }) => {
    const results = NPM_VERSION_FIXTURES.filter(
      (v) => v.repository === `${NPM_REPO_BASE}${params.id}/`,
    );
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),

  // Remotes
  http.get(NPM_REMOTE_BASE, () =>
    HttpResponse.json({
      count: npmRemotes.length,
      next: null,
      previous: null,
      results: npmRemotes,
    }),
  ),
  http.post(NPM_REMOTE_BASE, async ({ request }) => {
    const body = (await request.json()) as NpmRemoteCreate;
    const remote: NpmRemote = {
      pulp_href: `${NPM_REMOTE_BASE}${freshId()}/`,
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
    npmRemotes = [...npmRemotes, remote];
    return HttpResponse.json(remote, { status: 201 });
  }),
  http.delete(`${NPM_REMOTE_BASE}:id/`, ({ params }) => {
    const href = `${NPM_REMOTE_BASE}${params.id}/`;
    npmRemotes = npmRemotes.filter((r) => r.pulp_href !== href);
    return HttpResponse.json({ task: registerTask("Delete remote") }, { status: 202 });
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${NPM_REMOTE_BASE}:id/`, async ({ params, request }) => {
    const href = `${NPM_REMOTE_BASE}${params.id}/`;
    const body = (await request.json()) as NpmRemoteUpdate;
    npmRemotes = npmRemotes.map((r) => {
      if (r.pulp_href !== href) {
        return r;
      }
      const hiddenFields = r.hidden_fields.map((f) =>
        f.name in body && body[f.name as keyof NpmRemoteUpdate]
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

  // Distributions
  http.get(NPM_DIST_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repository = url.searchParams.get("repository");
    const results = repository
      ? npmDistributions.filter((d) => d.repository === repository)
      : npmDistributions;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(NPM_DIST_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      base_path: string;
      repository?: string;
      remote?: string;
    };
    const id = freshId();
    const distribution = {
      pulp_href: `${NPM_DIST_BASE}${id}/`,
      name: body.name,
      base_path: body.base_path,
      base_url: `https://pulp.example.com/pulp/content/${body.base_path}/`,
      repository: body.repository ?? null,
      remote: body.remote ?? null,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    const task = registerTask(`Create distribution "${body.name}"`);
    npmDistributions = [...npmDistributions, distribution];
    return HttpResponse.json({ task }, { status: 202 });
  }),
  http.delete(`${NPM_DIST_BASE}:id/`, ({ params }) => {
    const href = `${NPM_DIST_BASE}${params.id}/`;
    npmDistributions = npmDistributions.filter((d) => d.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete distribution") },
      { status: 202 },
    );
  }),

  // Content - VERIFIED live: like maven, this upload is itself asynchronous
  // (202 + task), not a sync 201 returning the created content object.
  http.get(NPM_CONTENT_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repositoryVersion = url.searchParams.get("repository_version");
    const results = repositoryVersion ? [] : npmContent;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(NPM_CONTENT_BASE, async ({ request }) => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return HttpResponse.json({ detail: "expected multipart upload" }, { status: 400 });
    }
    const formData = await request.formData();
    const relativePath = formData.get("relative_path");
    const content = {
      ...NPM_CONTENT_FIXTURE,
      pulp_href: `${NPM_CONTENT_BASE}${freshId()}/`,
      relative_path:
        typeof relativePath === "string"
          ? relativePath
          : NPM_CONTENT_FIXTURE.relative_path,
    };
    npmContent = [...npmContent, content];
    return HttpResponse.json(
      { task: registerTask("Add package to repository") },
      { status: 202 },
    );
  }),
];

// ---------------------------------------------------------------------------
// Python fixtures - shapes VERIFIED against the live OpenAPI schema of a
// pulpcore 3.116.1 instance with pulp_python 3.35.0 installed
// (component=python - docs/PULP_API.md, the pulp-api skill). Full
// File/RPM-parity for repository/remote/publish (a `remote` + `sync/` on
// Repository, `autopublish`, a real publication endpoint) - but like
// maven/npm (and unlike File), content upload is itself asynchronous
// (202 + task) with an optional `repository` field baked directly into the
// same call.
const PYTHON_REPO_BASE = "/pulp/api/v3/repositories/python/python/";
const PYTHON_REMOTE_BASE = "/pulp/api/v3/remotes/python/python/";
// VERIFIED live: distribution/publication paths live under `.../pypi/`, not
// `.../python/`.
const PYTHON_DIST_BASE = "/pulp/api/v3/distributions/python/pypi/";
const PYTHON_CONTENT_BASE = "/pulp/api/v3/content/python/packages/";
const PYTHON_PUBLICATIONS_BASE = "/pulp/api/v3/publications/python/pypi/";

export const PYTHON_REMOTE_FIXTURE: PythonRemote = {
  pulp_href: `${PYTHON_REMOTE_BASE}remote-1/`,
  name: "test-python-fixture",
  url: "https://pypi.org/simple/",
  policy: "immediate",
  pulp_created: "2026-08-20T10:00:00.000000Z",
  proxy_url: null,
  tls_validation: true,
  ca_cert: null,
  includes: [],
  excludes: [],
  prereleases: false,
  package_types: [],
  keep_latest_packages: 0,
  exclude_platforms: [],
  hidden_fields: [
    { name: "proxy_username", is_set: false },
    { name: "proxy_password", is_set: false },
    { name: "username", is_set: false },
    { name: "password", is_set: false },
  ],
};

export const PYTHON_REPO_FIXTURE = {
  pulp_href: `${PYTHON_REPO_BASE}repo-1/`,
  name: "test-python-repo",
  description: "A test Python repository",
  remote: PYTHON_REMOTE_FIXTURE.pulp_href,
  autopublish: true,
  versions_href: `${PYTHON_REPO_BASE}repo-1/versions/`,
  latest_version_href: `${PYTHON_REPO_BASE}repo-1/versions/1/`,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

export const PYTHON_VERSION_FIXTURES = [
  {
    pulp_href: `${PYTHON_REPO_BASE}repo-1/versions/1/`,
    number: 1,
    repository: PYTHON_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:05:00.000000Z",
    content_summary: {
      added: {
        "python.package": { count: 3, href: `${PYTHON_REPO_BASE}repo-1/versions/1/` },
      },
      removed: {},
      present: {
        "python.package": { count: 3, href: `${PYTHON_REPO_BASE}repo-1/versions/1/` },
      },
    },
  },
  {
    pulp_href: `${PYTHON_REPO_BASE}repo-1/versions/0/`,
    number: 0,
    repository: PYTHON_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:00:00.000000Z",
    content_summary: { added: {}, removed: {}, present: {} },
  },
];

export const PYTHON_CONTENT_FIXTURE: PythonContent = {
  pulp_href: `${PYTHON_CONTENT_BASE}content-1/`,
  name: "my-package",
  version: "1.0",
  filename: "my_package-1.0-py3-none-any.whl",
  packagetype: "bdist_wheel",
};

export const PYTHON_DISTRIBUTION_FIXTURE = {
  pulp_href: `${PYTHON_DIST_BASE}dist-1/`,
  name: "existing-python-dist",
  base_path: "existing-python-dist-path",
  base_url: "https://pulp.example.com/pulp/content/existing-python-dist-path/",
  repository: PYTHON_REPO_FIXTURE.pulp_href,
  publication: null,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

function seedPythonRepositories(): PythonRepository[] {
  return [{ ...PYTHON_REPO_FIXTURE }];
}
function seedPythonRemotes(): PythonRemote[] {
  return [{ ...PYTHON_REMOTE_FIXTURE }];
}
function seedPythonDistributions(): PythonDistribution[] {
  return [{ ...PYTHON_DISTRIBUTION_FIXTURE }];
}
function seedPythonContent(): PythonContent[] {
  return [{ ...PYTHON_CONTENT_FIXTURE }];
}

let pythonRepositories = seedPythonRepositories();
let pythonRemotes = seedPythonRemotes();
let pythonDistributions = seedPythonDistributions();
let pythonContent = seedPythonContent();

/** Restores every Python in-memory fixture store to its initial seed - call from `afterEach`. */
export function resetPythonFixtures() {
  pythonRepositories = seedPythonRepositories();
  pythonRemotes = seedPythonRemotes();
  pythonDistributions = seedPythonDistributions();
  pythonContent = seedPythonContent();
}

const pythonHandlers = [
  // Repositories
  http.get(PYTHON_REPO_BASE, ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const results = name
      ? pythonRepositories.filter((r) => r.name === name)
      : pythonRepositories;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(PYTHON_REPO_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      remote?: string;
      autopublish?: boolean;
    };
    const id = freshId();
    const repo = {
      pulp_href: `${PYTHON_REPO_BASE}${id}/`,
      name: body.name,
      description: body.description ?? null,
      remote: body.remote ?? null,
      autopublish: body.autopublish ?? false,
      versions_href: `${PYTHON_REPO_BASE}${id}/versions/`,
      latest_version_href: `${PYTHON_REPO_BASE}${id}/versions/0/`,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    pythonRepositories = [...pythonRepositories, repo];
    return HttpResponse.json(repo, { status: 201 });
  }),
  http.get(`${PYTHON_REPO_BASE}:id/`, ({ params }) => {
    const href = `${PYTHON_REPO_BASE}${params.id}/`;
    const repo = pythonRepositories.find((r) => r.pulp_href === href);
    if (!repo) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(repo);
  }),
  http.delete(`${PYTHON_REPO_BASE}:id/`, ({ params }) => {
    const href = `${PYTHON_REPO_BASE}${params.id}/`;
    pythonRepositories = pythonRepositories.filter((r) => r.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask(`Delete repository`) },
      { status: 202 },
    );
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${PYTHON_REPO_BASE}:id/`, async ({ params, request }) => {
    const href = `${PYTHON_REPO_BASE}${params.id}/`;
    const body = (await request.json()) as Partial<PythonRepository>;
    pythonRepositories = pythonRepositories.map((r) =>
      r.pulp_href === href ? { ...r, ...body } : r,
    );
    return HttpResponse.json(
      { task: registerTask("Update repository") },
      { status: 202 },
    );
  }),
  http.post(`${PYTHON_REPO_BASE}:id/sync/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Sync repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.get(`${PYTHON_REPO_BASE}:id/versions/`, ({ params }) => {
    const results = PYTHON_VERSION_FIXTURES.filter(
      (v) => v.repository === `${PYTHON_REPO_BASE}${params.id}/`,
    );
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),

  // Remotes
  http.get(PYTHON_REMOTE_BASE, () =>
    HttpResponse.json({
      count: pythonRemotes.length,
      next: null,
      previous: null,
      results: pythonRemotes,
    }),
  ),
  http.post(PYTHON_REMOTE_BASE, async ({ request }) => {
    const body = (await request.json()) as PythonRemoteCreate;
    const remote: PythonRemote = {
      pulp_href: `${PYTHON_REMOTE_BASE}${freshId()}/`,
      name: body.name,
      url: body.url,
      policy: body.policy ?? "immediate",
      pulp_created: "2026-08-20T11:00:00.000000Z",
      proxy_url: body.proxy_url ?? null,
      tls_validation: body.tls_validation ?? true,
      ca_cert: body.ca_cert ?? null,
      includes: body.includes ?? [],
      excludes: body.excludes ?? [],
      prereleases: body.prereleases ?? false,
      package_types: body.package_types ?? [],
      keep_latest_packages: body.keep_latest_packages ?? 0,
      exclude_platforms: body.exclude_platforms ?? [],
      hidden_fields: [
        { name: "proxy_username", is_set: Boolean(body.proxy_username) },
        { name: "proxy_password", is_set: Boolean(body.proxy_password) },
        { name: "username", is_set: Boolean(body.username) },
        { name: "password", is_set: Boolean(body.password) },
      ],
    };
    pythonRemotes = [...pythonRemotes, remote];
    return HttpResponse.json(remote, { status: 201 });
  }),
  http.delete(`${PYTHON_REMOTE_BASE}:id/`, ({ params }) => {
    const href = `${PYTHON_REMOTE_BASE}${params.id}/`;
    pythonRemotes = pythonRemotes.filter((r) => r.pulp_href !== href);
    return HttpResponse.json({ task: registerTask("Delete remote") }, { status: 202 });
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${PYTHON_REMOTE_BASE}:id/`, async ({ params, request }) => {
    const href = `${PYTHON_REMOTE_BASE}${params.id}/`;
    const body = (await request.json()) as PythonRemoteUpdate;
    pythonRemotes = pythonRemotes.map((r) => {
      if (r.pulp_href !== href) {
        return r;
      }
      const hiddenFields = r.hidden_fields.map((f) =>
        f.name in body && body[f.name as keyof PythonRemoteUpdate]
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
        ...(body.includes !== undefined ? { includes: body.includes } : {}),
        ...(body.excludes !== undefined ? { excludes: body.excludes } : {}),
        ...(body.prereleases !== undefined ? { prereleases: body.prereleases } : {}),
        ...(body.package_types !== undefined
          ? { package_types: body.package_types }
          : {}),
        ...(body.keep_latest_packages !== undefined
          ? { keep_latest_packages: body.keep_latest_packages }
          : {}),
        ...(body.exclude_platforms !== undefined
          ? { exclude_platforms: body.exclude_platforms }
          : {}),
        hidden_fields: hiddenFields,
      };
    });
    return HttpResponse.json({ task: registerTask("Update remote") }, { status: 202 });
  }),

  // Distributions
  http.get(PYTHON_DIST_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repository = url.searchParams.get("repository");
    const results = repository
      ? pythonDistributions.filter((d) => d.repository === repository)
      : pythonDistributions;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(PYTHON_DIST_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      base_path: string;
      repository?: string;
    };
    const id = freshId();
    const distribution = {
      pulp_href: `${PYTHON_DIST_BASE}${id}/`,
      name: body.name,
      base_path: body.base_path,
      base_url: `https://pulp.example.com/pulp/content/${body.base_path}/`,
      repository: body.repository ?? null,
      publication: null,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    const task = registerTask(`Create distribution "${body.name}"`);
    pythonDistributions = [...pythonDistributions, distribution];
    return HttpResponse.json({ task }, { status: 202 });
  }),
  http.delete(`${PYTHON_DIST_BASE}:id/`, ({ params }) => {
    const href = `${PYTHON_DIST_BASE}${params.id}/`;
    pythonDistributions = pythonDistributions.filter((d) => d.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete distribution") },
      { status: 202 },
    );
  }),

  // Content - VERIFIED live: like maven/npm, this upload is itself
  // asynchronous (202 + task), not a sync 201 returning the created content
  // object.
  http.get(PYTHON_CONTENT_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repositoryVersion = url.searchParams.get("repository_version");
    const results = repositoryVersion ? [] : pythonContent;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(PYTHON_CONTENT_BASE, async ({ request }) => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return HttpResponse.json({ detail: "expected multipart upload" }, { status: 400 });
    }
    const formData = await request.formData();
    const relativePath = formData.get("relative_path");
    const content = {
      ...PYTHON_CONTENT_FIXTURE,
      pulp_href: `${PYTHON_CONTENT_BASE}${freshId()}/`,
      filename:
        typeof relativePath === "string" ? relativePath : PYTHON_CONTENT_FIXTURE.filename,
    };
    pythonContent = [...pythonContent, content];
    return HttpResponse.json(
      { task: registerTask("Add package to repository") },
      { status: 202 },
    );
  }),

  // Publications
  http.post(PYTHON_PUBLICATIONS_BASE, () =>
    HttpResponse.json({ task: registerTask("Publish repository") }, { status: 202 }),
  ),
];

// ---------------------------------------------------------------------------
// Debian fixtures - shapes VERIFIED against the live OpenAPI schema of a
// pulpcore 3.116.1 instance with pulp_deb 3.10.0 installed (component=deb -
// docs/PULP_API.md, the pulp-api skill). Full File/RPM-parity for
// repository/remote/publish (a `remote` + `sync/` on Repository,
// `autopublish`, a real publication endpoint - the "apt" one; there's also
// a "verbatim" publication type, deliberately unsupported here) - but every
// path segment is "apt", not "deb". Content upload is like maven/npm/
// python's, not File's: async (202 + task) with an optional `repository`
// field baked directly into the same call. Unlike every other plugin's
// remote in this app, this one has a second REQUIRED field:
// `distributions` (a whitespace-separated string, not an array).
const DEB_REPO_BASE = "/pulp/api/v3/repositories/deb/apt/";
const DEB_REMOTE_BASE = "/pulp/api/v3/remotes/deb/apt/";
const DEB_DIST_BASE = "/pulp/api/v3/distributions/deb/apt/";
const DEB_CONTENT_BASE = "/pulp/api/v3/content/deb/packages/";
const DEB_PUBLICATIONS_BASE = "/pulp/api/v3/publications/deb/apt/";

export const DEB_REMOTE_FIXTURE: DebRemote = {
  pulp_href: `${DEB_REMOTE_BASE}remote-1/`,
  name: "test-deb-fixture",
  url: "http://deb.debian.org/debian",
  distributions: "bookworm",
  components: null,
  architectures: null,
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

export const DEB_REPO_FIXTURE = {
  pulp_href: `${DEB_REPO_BASE}repo-1/`,
  name: "test-deb-repo",
  description: "A test Debian repository",
  remote: DEB_REMOTE_FIXTURE.pulp_href,
  autopublish: true,
  versions_href: `${DEB_REPO_BASE}repo-1/versions/`,
  latest_version_href: `${DEB_REPO_BASE}repo-1/versions/1/`,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

export const DEB_VERSION_FIXTURES = [
  {
    pulp_href: `${DEB_REPO_BASE}repo-1/versions/1/`,
    number: 1,
    repository: DEB_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:05:00.000000Z",
    content_summary: {
      added: {
        "deb.package": { count: 3, href: `${DEB_REPO_BASE}repo-1/versions/1/` },
      },
      removed: {},
      present: {
        "deb.package": { count: 3, href: `${DEB_REPO_BASE}repo-1/versions/1/` },
      },
    },
  },
  {
    pulp_href: `${DEB_REPO_BASE}repo-1/versions/0/`,
    number: 0,
    repository: DEB_REPO_FIXTURE.pulp_href,
    pulp_created: "2026-08-20T10:00:00.000000Z",
    content_summary: { added: {}, removed: {}, present: {} },
  },
];

export const DEB_CONTENT_FIXTURE: DebContent = {
  pulp_href: `${DEB_CONTENT_BASE}content-1/`,
  package: "my-package",
  version: "1.0",
  architecture: "amd64",
};

export const DEB_DISTRIBUTION_FIXTURE = {
  pulp_href: `${DEB_DIST_BASE}dist-1/`,
  name: "existing-deb-dist",
  base_path: "existing-deb-dist-path",
  base_url: "https://pulp.example.com/pulp/content/existing-deb-dist-path/",
  repository: DEB_REPO_FIXTURE.pulp_href,
  publication: null,
  pulp_created: "2026-08-20T10:00:00.000000Z",
};

function seedDebRepositories(): DebRepository[] {
  return [{ ...DEB_REPO_FIXTURE }];
}
function seedDebRemotes(): DebRemote[] {
  return [{ ...DEB_REMOTE_FIXTURE }];
}
function seedDebDistributions(): DebDistribution[] {
  return [{ ...DEB_DISTRIBUTION_FIXTURE }];
}
function seedDebContent(): DebContent[] {
  return [{ ...DEB_CONTENT_FIXTURE }];
}

let debRepositories = seedDebRepositories();
let debRemotes = seedDebRemotes();
let debDistributions = seedDebDistributions();
let debContent = seedDebContent();

/** Restores every Debian in-memory fixture store to its initial seed - call from `afterEach`. */
export function resetDebFixtures() {
  debRepositories = seedDebRepositories();
  debRemotes = seedDebRemotes();
  debDistributions = seedDebDistributions();
  debContent = seedDebContent();
}

const debHandlers = [
  // Repositories
  http.get(DEB_REPO_BASE, ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const results = name
      ? debRepositories.filter((r) => r.name === name)
      : debRepositories;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(DEB_REPO_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      remote?: string;
      autopublish?: boolean;
    };
    const id = freshId();
    const repo = {
      pulp_href: `${DEB_REPO_BASE}${id}/`,
      name: body.name,
      description: body.description ?? null,
      remote: body.remote ?? null,
      autopublish: body.autopublish ?? false,
      versions_href: `${DEB_REPO_BASE}${id}/versions/`,
      latest_version_href: `${DEB_REPO_BASE}${id}/versions/0/`,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    debRepositories = [...debRepositories, repo];
    return HttpResponse.json(repo, { status: 201 });
  }),
  http.get(`${DEB_REPO_BASE}:id/`, ({ params }) => {
    const href = `${DEB_REPO_BASE}${params.id}/`;
    const repo = debRepositories.find((r) => r.pulp_href === href);
    if (!repo) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(repo);
  }),
  http.delete(`${DEB_REPO_BASE}:id/`, ({ params }) => {
    const href = `${DEB_REPO_BASE}${params.id}/`;
    debRepositories = debRepositories.filter((r) => r.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask(`Delete repository`) },
      { status: 202 },
    );
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${DEB_REPO_BASE}:id/`, async ({ params, request }) => {
    const href = `${DEB_REPO_BASE}${params.id}/`;
    const body = (await request.json()) as Partial<DebRepository>;
    debRepositories = debRepositories.map((r) =>
      r.pulp_href === href ? { ...r, ...body } : r,
    );
    return HttpResponse.json(
      { task: registerTask("Update repository") },
      { status: 202 },
    );
  }),
  http.post(`${DEB_REPO_BASE}:id/sync/`, ({ params }) =>
    HttpResponse.json(
      { task: registerTask(`Sync repository ${params.id}`) },
      { status: 202 },
    ),
  ),
  http.get(`${DEB_REPO_BASE}:id/versions/`, ({ params }) => {
    const results = DEB_VERSION_FIXTURES.filter(
      (v) => v.repository === `${DEB_REPO_BASE}${params.id}/`,
    );
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),

  // Remotes
  http.get(DEB_REMOTE_BASE, () =>
    HttpResponse.json({
      count: debRemotes.length,
      next: null,
      previous: null,
      results: debRemotes,
    }),
  ),
  http.post(DEB_REMOTE_BASE, async ({ request }) => {
    const body = (await request.json()) as DebRemoteCreate;
    const remote: DebRemote = {
      pulp_href: `${DEB_REMOTE_BASE}${freshId()}/`,
      name: body.name,
      url: body.url,
      distributions: body.distributions,
      components: body.components ?? null,
      architectures: body.architectures ?? null,
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
    debRemotes = [...debRemotes, remote];
    return HttpResponse.json(remote, { status: 201 });
  }),
  http.delete(`${DEB_REMOTE_BASE}:id/`, ({ params }) => {
    const href = `${DEB_REMOTE_BASE}${params.id}/`;
    debRemotes = debRemotes.filter((r) => r.pulp_href !== href);
    return HttpResponse.json({ task: registerTask("Delete remote") }, { status: 202 });
  }),
  // VERIFIED live: PATCH is asynchronous (202 + task), unlike POST create.
  http.patch(`${DEB_REMOTE_BASE}:id/`, async ({ params, request }) => {
    const href = `${DEB_REMOTE_BASE}${params.id}/`;
    const body = (await request.json()) as DebRemoteUpdate;
    debRemotes = debRemotes.map((r) => {
      if (r.pulp_href !== href) {
        return r;
      }
      const hiddenFields = r.hidden_fields.map((f) =>
        f.name in body && body[f.name as keyof DebRemoteUpdate]
          ? { ...f, is_set: true }
          : f,
      );
      return {
        ...r,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.url !== undefined ? { url: body.url } : {}),
        ...(body.distributions !== undefined
          ? { distributions: body.distributions }
          : {}),
        ...(body.components !== undefined ? { components: body.components } : {}),
        ...(body.architectures !== undefined
          ? { architectures: body.architectures }
          : {}),
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

  // Distributions
  http.get(DEB_DIST_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repository = url.searchParams.get("repository");
    const results = repository
      ? debDistributions.filter((d) => d.repository === repository)
      : debDistributions;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(DEB_DIST_BASE, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      base_path: string;
      repository?: string;
    };
    const id = freshId();
    const distribution = {
      pulp_href: `${DEB_DIST_BASE}${id}/`,
      name: body.name,
      base_path: body.base_path,
      base_url: `https://pulp.example.com/pulp/content/${body.base_path}/`,
      repository: body.repository ?? null,
      publication: null,
      pulp_created: "2026-08-20T11:00:00.000000Z",
    };
    const task = registerTask(`Create distribution "${body.name}"`);
    debDistributions = [...debDistributions, distribution];
    return HttpResponse.json({ task }, { status: 202 });
  }),
  http.delete(`${DEB_DIST_BASE}:id/`, ({ params }) => {
    const href = `${DEB_DIST_BASE}${params.id}/`;
    debDistributions = debDistributions.filter((d) => d.pulp_href !== href);
    return HttpResponse.json(
      { task: registerTask("Delete distribution") },
      { status: 202 },
    );
  }),

  // Content - VERIFIED live: like maven/npm/python, this upload is itself
  // asynchronous (202 + task), not a sync 201 returning the created content
  // object.
  http.get(DEB_CONTENT_BASE, ({ request }) => {
    const url = new URL(request.url);
    const repositoryVersion = url.searchParams.get("repository_version");
    const results = repositoryVersion ? [] : debContent;
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
  http.post(DEB_CONTENT_BASE, async ({ request }) => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return HttpResponse.json({ detail: "expected multipart upload" }, { status: 400 });
    }
    const content = {
      ...DEB_CONTENT_FIXTURE,
      pulp_href: `${DEB_CONTENT_BASE}${freshId()}/`,
    };
    debContent = [...debContent, content];
    return HttpResponse.json(
      { task: registerTask("Add package to repository") },
      { status: 202 },
    );
  }),

  // Publications
  http.post(DEB_PUBLICATIONS_BASE, () =>
    HttpResponse.json({ task: registerTask("Publish repository") }, { status: 202 }),
  ),
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

// The generic cross-plugin list endpoint the Tasks page resolves a task's
// reserved PRNs through (src/api/client/taskResources.ts). Only the
// repository the COMPLETED fixture reserved exists - anything else reads as
// deleted, like a real resource removed after its task ran.
const TASK_RESOURCE_REPOSITORIES = [
  {
    pulp_href: RPM_REPO_FIXTURE.pulp_href,
    prn: "prn:rpm.rpmrepository:test",
    name: RPM_REPO_FIXTURE.name,
  },
];

const taskHistoryHandlers = [
  http.get("/pulp/api/v3/repositories/", ({ request }) => {
    const prns = new URL(request.url).searchParams.get("prn__in")?.split(",") ?? [];
    const results = TASK_RESOURCE_REPOSITORIES.filter((repo) => prns.includes(repo.prn));
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),
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
// pulpit-core's content_size module (backend-cached, see
// docs/ARCHITECTURE.md "Derived content sizes and repository counts")
// provides sizes for the populated RPM/Ansible/Container plugins; core has
// no content units.
export const COMPONENT_CONTENT_SIZES_FIXTURE = [
  { component: "rpm", size_bytes: 200381, updated_at: "2026-01-01T00:00:00Z" },
  { component: "ansible", size_bytes: 2017, updated_at: "2026-01-01T00:00:00Z" },
  { component: "container", size_bytes: 52199, updated_at: "2026-01-01T00:00:00Z" },
];

// Same totals as above, keyed by the one seeded repository per plugin
// (each fixture plugin seeds exactly one repository - RPM_REPO_FIXTURE etc.
// above) rather than by component.
export const REPOSITORY_CONTENT_SIZES_FIXTURE = [
  {
    repository_href: RPM_REPO_FIXTURE.pulp_href,
    size_bytes: 200381,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    repository_href: ANSIBLE_REPO_FIXTURE.pulp_href,
    size_bytes: 2017,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    repository_href: CONTAINER_REPO_FIXTURE.pulp_href,
    size_bytes: 52199,
    updated_at: "2026-01-01T00:00:00Z",
  },
];

// One repository per plugin fixture (see each plugin's own seed*Repositories()).
export const COMPONENT_REPOSITORY_COUNTS_FIXTURE = [
  { component: "rpm", count: 1, updated_at: "2026-01-01T00:00:00Z" },
  { component: "ansible", count: 1, updated_at: "2026-01-01T00:00:00Z" },
  { component: "container", count: 1, updated_at: "2026-01-01T00:00:00Z" },
  { component: "deb", count: 1, updated_at: "2026-01-01T00:00:00Z" },
  { component: "file", count: 1, updated_at: "2026-01-01T00:00:00Z" },
  { component: "gem", count: 1, updated_at: "2026-01-01T00:00:00Z" },
  { component: "hugging_face", count: 1, updated_at: "2026-01-01T00:00:00Z" },
  { component: "maven", count: 1, updated_at: "2026-01-01T00:00:00Z" },
  { component: "npm", count: 1, updated_at: "2026-01-01T00:00:00Z" },
  { component: "python", count: 1, updated_at: "2026-01-01T00:00:00Z" },
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

  // pulpit-core's content_size module - backend-cached sizes/counts (see
  // docs/ARCHITECTURE.md "Derived content sizes and repository counts").
  http.get("/pulpit-core/api/v1/content_size/sizes", () =>
    HttpResponse.json(COMPONENT_CONTENT_SIZES_FIXTURE),
  ),
  http.get("/pulpit-core/api/v1/content_size/repository-sizes", () =>
    HttpResponse.json(REPOSITORY_CONTENT_SIZES_FIXTURE),
  ),
  http.get("/pulpit-core/api/v1/content_size/repository-counts", () =>
    HttpResponse.json(COMPONENT_REPOSITORY_COUNTS_FIXTURE),
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

  // Unrestricted by default (matches an admin/staff test session, the
  // common case) - AppNav calls this unconditionally (AppNav.test.tsx).
  // Tests exercising actual nav-visibility restrictions override this with
  // server.use(...), same convention as default_settings above.
  http.get("/pulpit-core/api/v1/nav_visibility/me", () =>
    HttpResponse.json({ visible_module_ids: null }),
  ),

  // Nothing granted by default (the real allow-list default) - the
  // Administration "General" tab calls this unconditionally on mount.
  // Tests exercising specific grants override this with server.use(...),
  // same convention as default_settings above.
  http.get("/pulpit-core/api/v1/nav_visibility/settings", () =>
    HttpResponse.json({ visible_module_ids: [] }),
  ),
  http.put("/pulpit-core/api/v1/nav_visibility/settings", async ({ request }) => {
    const body = (await request.json()) as { visible_module_ids: string[] };
    return HttpResponse.json({ visible_module_ids: body.visible_module_ids });
  }),

  // A healthy, far-from-expiring self-signed certificate by default - the
  // Overview page calls this unconditionally (useTlsCertWarning). Tests
  // exercising the expiry warning itself override this with server.use(...).
  http.get("/pulpit-core/api/v1/tls/active", () =>
    HttpResponse.json({
      id: "00000000-0000-0000-0000-000000000001",
      source: "self_signed",
      subject: "pulpit.local",
      fingerprint_sha256: "aa".repeat(32),
      not_before: "2026-01-01T00:00:00Z",
      not_after: "2028-01-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      days_until_expiry: 365,
      warn_days: 30,
      is_expiring_soon: false,
    }),
  ),
  http.get("/pulpit-core/api/v1/tls/history", () => HttpResponse.json([])),

  // A clean check by default - the Overview page calls this unconditionally
  // (useApiCompatibilityWarning). Tests exercising the warning itself
  // override this with server.use(...).
  http.get("/pulpit-core/api/v1/api_compatibility/latest", () =>
    HttpResponse.json({
      checked_at: "2026-01-01T00:00:00Z",
      pulp_reachable: true,
      missing_endpoints: [],
      error: null,
    }),
  ),
];

export const handlers = [
  ...authHandlers,
  ...rpmHandlers,
  ...fileHandlers,
  ...huggingFaceHandlers,
  ...gemHandlers,
  ...mavenHandlers,
  ...npmHandlers,
  ...pythonHandlers,
  ...debHandlers,
  ...ansibleHandlers,
  ...containerHandlers,
  ...accessHandlers,
  ...administrationHandlers,
  ...taskHistoryHandlers,
  ...pulpitCoreHandlers,
];
