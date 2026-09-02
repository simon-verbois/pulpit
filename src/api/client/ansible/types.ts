// VERIFIED against the live OpenAPI schema of a pulpcore 3.116.0 / pulp_ansible
// 0.30.0 instance (fetched from /pulp/api/v3/docs/api.json?component=ansible -
// see docs/PULP_API.md). Only the fields Pulpit's UI actually reads/writes are
// modeled here. Re-exports PulpPage from the RPM types module rather than
// duplicating it - it's a generic Pulp envelope, not RPM-specific.
export type { PulpPage, RemotePolicy, HiddenRemoteField } from "../rpm/types";
import type { RemotePolicy, HiddenRemoteField } from "../rpm/types";

/** VERIFIED live: the Galaxy-v3 cross-repository search endpoint
 * (search.ts) uses this `meta`/`links`/`data` pagination envelope, NOT
 * Pulp's normal `count`/`next`/`previous`/`results` shape that every other
 * list endpoint in this app uses (including the Galaxy namespace *list*
 * endpoint, which - despite living under the same `/pulp_ansible/galaxy/...`
 * mount - still uses the normal Pulp envelope; this shape is specific to
 * the search endpoint alone). */
export interface GalaxyPage<T> {
  meta: { count: number };
  links: {
    first: string | null;
    previous: string | null;
    next: string | null;
    last: string | null;
  };
  data: T[];
}

export interface AnsibleRepository {
  pulp_href: string;
  name: string;
  description: string | null;
  remote: string | null;
  retain_repo_versions: number | null;
  gpgkey: string | null;
  private: boolean;
  versions_href: string;
  latest_version_href: string;
  pulp_created: string;
}

export interface AnsibleRepositoryCreate {
  name: string;
  description?: string | null;
  remote?: string | null;
  retain_repo_versions?: number | null;
  gpgkey?: string | null;
  private?: boolean;
}

/** PATCH body - every field optional (partial update). */
export interface AnsibleRepositoryUpdate {
  name?: string;
  description?: string | null;
  remote?: string | null;
  retain_repo_versions?: number | null;
  gpgkey?: string | null;
  private?: boolean;
}

/** Shared "advanced connection settings" shape for Collection/Role remotes -
 * Git remotes have no `policy` (a git clone has no immediate/on_demand
 * choice) and no `token`/`requirements_file`/Automation-Hub fields. */
export interface AnsibleRemoteConnectionSettings {
  proxy_url?: string | null;
  proxy_username?: string | null;
  proxy_password?: string | null;
  username?: string | null;
  password?: string | null;
  tls_validation?: boolean;
}

export interface CollectionRemote {
  pulp_href: string;
  name: string;
  url: string;
  policy: RemotePolicy;
  pulp_created: string;
  proxy_url: string | null;
  tls_validation: boolean;
  hidden_fields: HiddenRemoteField[];
  requirements_file: string | null;
  auth_url: string | null;
  sync_dependencies: boolean;
  signed_only: boolean;
  sync_highest_versions: number | null;
}

export interface CollectionRemoteCreate extends AnsibleRemoteConnectionSettings {
  name: string;
  url: string;
  policy?: RemotePolicy;
  requirements_file?: string | null;
  auth_url?: string | null;
  /** Write-only Automation Hub token - never echoed back on GET. */
  token?: string | null;
  sync_dependencies?: boolean;
  signed_only?: boolean;
  sync_highest_versions?: number | null;
}

export type CollectionRemoteUpdate = Partial<CollectionRemoteCreate>;

/** A remote that clones roles directly from a git repository - no `policy`
 * (VERIFIED live schema: absent from GitRemote, unlike every other remote in
 * this app). */
export interface GitRemote {
  pulp_href: string;
  name: string;
  url: string;
  pulp_created: string;
  proxy_url: string | null;
  tls_validation: boolean;
  hidden_fields: HiddenRemoteField[];
  git_ref: string | null;
  metadata_only: boolean;
}

export interface GitRemoteCreate extends AnsibleRemoteConnectionSettings {
  name: string;
  url: string;
  git_ref?: string | null;
  metadata_only?: boolean;
}

export type GitRemoteUpdate = Partial<GitRemoteCreate>;

/** Classic pre-collections Galaxy roles - same shape as an RPM remote. */
export interface RoleRemote {
  pulp_href: string;
  name: string;
  url: string;
  policy: RemotePolicy;
  pulp_created: string;
  proxy_url: string | null;
  tls_validation: boolean;
  hidden_fields: HiddenRemoteField[];
}

export interface RoleRemoteCreate extends AnsibleRemoteConnectionSettings {
  name: string;
  url: string;
  policy?: RemotePolicy;
}

export type RoleRemoteUpdate = Partial<RoleRemoteCreate>;

/** VERIFIED live schema: no `publication` concept at all for Ansible - a
 * distribution points directly at a repository/repository_version, unlike
 * RPM which requires an explicit publish step. `client_url` is the URL an
 * `ansible-galaxy`/Automation-Hub client should be pointed at. */
export interface AnsibleDistribution {
  pulp_href: string;
  name: string;
  base_path: string;
  repository: string | null;
  repository_version: string | null;
  client_url: string;
  pulp_created: string;
}

export interface AnsibleDistributionCreate {
  name: string;
  base_path: string;
  repository?: string | null;
}

export interface ContentSummary {
  added: Record<string, { count: number; href: string }>;
  removed: Record<string, { count: number; href: string }>;
  present: Record<string, { count: number; href: string }>;
}

export interface RepositoryVersion {
  pulp_href: string;
  number: number;
  repository: string;
  pulp_created: string;
  content_summary: ContentSummary;
}

/** A Collection Version - the core Ansible content unit (a specific version
 * of a namespace.name collection, e.g. community.general 8.1.0). */
export interface CollectionVersion {
  pulp_href: string;
  namespace: string;
  name: string;
  version: string;
  authors: string[];
  description: string | null;
  documentation: string | null;
  homepage: string | null;
  issues: string | null;
  license: string[];
  tags: { name: string }[];
  requires_ansible: string | null;
  sha256: string | null;
  pulp_created: string;
}

/** Classic (pre-collections) Ansible role content - a single version of a
 * namespace/name role. */
export interface AnsibleRole {
  pulp_href: string;
  name: string;
  namespace: string;
  version: string;
  pulp_created: string;
}

export interface AnsibleRoleCreate {
  name: string;
  namespace: string;
  version: string;
  artifact: string;
  repository?: string;
}

/** A related link shown on a Galaxy namespace's profile (VERIFIED live
 * schema: `name`/`url`, both required). */
export interface GalaxyNamespaceLink {
  name: string;
  url: string;
}

/** The *editable* Galaxy-API namespace (company/email/avatar/links) - lives
 * inside a specific distribution's own Galaxy-compatible API mount
 * (`/pulp_ansible/galaxy/<base_path>/api/v3/plugin/ansible/content/
 * <base_path>/namespaces/`), NOT a global resource. Distinct from the
 * read-only, sync-derived `content/ansible/namespaces/` content type, which
 * Pulpit does not manage directly (see docs/PULP_API.md). */
export interface GalaxyNamespace {
  pulp_href: string;
  name: string;
  company: string;
  email: string;
  description: string;
  resources: string;
  links: GalaxyNamespaceLink[];
  avatar_url: string | null;
}

export interface GalaxyNamespaceCreate {
  name: string;
  company?: string;
  email?: string;
  description?: string;
  resources?: string;
  links?: GalaxyNamespaceLink[];
  avatar?: File;
}

export type GalaxyNamespaceUpdate = Partial<GalaxyNamespaceCreate>;

/** A detached PGP signature over a collection version (VERIFIED live schema:
 * created via upload, references the collection version + the signing
 * service that produced it). */
export interface CollectionVersionSignature {
  pulp_href: string;
  signed_collection: string;
  pubkey_fingerprint: string;
  signing_service: string | null;
  pulp_created: string;
}

/** An arbitrary label attached to a collection version (VERIFIED live
 * schema: free-form `value` string, e.g. used by some deployments for
 * "certified"/"community" style tagging). */
export interface CollectionVersionMark {
  pulp_href: string;
  marked_collection: string;
  value: string;
  pulp_created: string;
}

/** Marks a namespace+name collection (across all its versions) as
 * deprecated. */
export interface CollectionDeprecation {
  pulp_href: string;
  namespace: string;
  name: string;
  pulp_created: string;
}

/** A read-only, sync-derived signing service Pulp already has configured
 * (pulpcore-level, not ansible-specific) - needed to populate the "Sign"
 * action's signing-service picker. Full signing-service management is out
 * of scope here (deferred to Milestone 6, see docs/ROADMAP.md). */
export interface SigningService {
  pulp_href: string;
  name: string;
  pubkey_fingerprint: string;
}

export interface CrossRepoSearchResult {
  collection_version: CollectionVersion;
  repository: { name: string; pulp_href: string };
  is_highest: boolean;
  is_deprecated: boolean;
  is_signed: boolean;
}
