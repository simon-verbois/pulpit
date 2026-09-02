// VERIFIED against the live OpenAPI schema of a pulpcore 3.116.0 / pulp_rpm
// 3.38.5 instance (fetched from /pulp/api/v3/docs/api.json - see
// docs/PULP_API.md and the pulp-api skill). Only the fields Pulpit's UI
// actually reads/writes are modeled here.

/** Pulp's standard limit/offset pagination envelope. */
export interface PulpPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface RpmRepository {
  pulp_href: string;
  name: string;
  description: string | null;
  remote: string | null;
  autopublish: boolean;
  versions_href: string;
  latest_version_href: string;
  pulp_created: string;
  /** VERIFIED live (docs/signing.md): an href to a core.SigningService of
   * class RpmPackageSigningService, or null. Package signing is on-upload
   * only - see docs/signing.md "Known limitations". Optional here (rather
   * than required-but-nullable) so the many existing repository fixtures
   * that predate the signing feature don't all need updating just to
   * satisfy the type - a real Pulp response always includes it. */
  package_signing_service?: string | null;
  /** Overrides which key the (shared, generic) package signing service
   * actually signs with for this repository - VERIFIED live: Pulp echoes
   * this back prefixed (e.g. "v4:<hex>") even though a plain hex fingerprint
   * is accepted on write. Treated as an opaque string everywhere in this app. */
  package_signing_fingerprint?: string | null;
  /** VERIFIED live: an href to a core.SigningService of class
   * AsciiArmoredDetachedSigningService, or null. */
  metadata_signing_service?: string | null;
}

export interface RpmRepositoryCreate {
  name: string;
  description?: string | null;
  remote?: string | null;
  /** VERIFIED against the live schema: optional, defaults to `false` on Pulp's side. */
  autopublish?: boolean;
  package_signing_service?: string | null;
  package_signing_fingerprint?: string | null;
  metadata_signing_service?: string | null;
}

/** PATCH body - every field optional (partial update). */
export interface RpmRepositoryUpdate {
  name?: string;
  description?: string | null;
  remote?: string | null;
  autopublish?: boolean;
  package_signing_service?: string | null;
  package_signing_fingerprint?: string | null;
  metadata_signing_service?: string | null;
}

export type RemotePolicy = "immediate" | "on_demand" | "streamed";

/** VERIFIED live: proxy_username/proxy_password/username/password are
 * write-only on Pulp's side - a GET response never echoes them back, only
 * whether one is currently set (see `RpmRemote.hidden_fields`). `name` is a
 * plain string rather than a fixed union - which write-only fields exist
 * varies by remote type (e.g. Ansible's Collection remote also hides
 * `token`, which no RPM remote has). */
export interface HiddenRemoteField {
  name: string;
  is_set: boolean;
}

export interface RpmRemote {
  pulp_href: string;
  name: string;
  url: string;
  policy: RemotePolicy;
  pulp_created: string;
  proxy_url: string | null;
  tls_validation: boolean;
  hidden_fields: HiddenRemoteField[];
}

/** Advanced connection settings shared by create/update payloads - all
 * optional, standard pulpcore Remote fields (not RPM-specific). Only
 * meaningful as *write* fields - see `RpmRemote.hidden_fields` for why
 * `proxy_username`/`proxy_password`/`username`/`password` have no read-side
 * counterpart. */
export interface RpmRemoteConnectionSettings {
  proxy_url?: string | null;
  proxy_username?: string | null;
  proxy_password?: string | null;
  username?: string | null;
  password?: string | null;
  tls_validation?: boolean;
}

export interface RpmRemoteCreate extends RpmRemoteConnectionSettings {
  name: string;
  url: string;
  policy?: RemotePolicy;
}

/** PATCH body - every field optional (partial update). */
export interface RpmRemoteUpdate extends RpmRemoteConnectionSettings {
  name?: string;
  url?: string;
  policy?: RemotePolicy;
}

/** Oracle ULN (Unbreakable Linux Network) - a second remote "flavor",
 * same base shape as RpmRemote plus `uln_server_base_url`. VERIFIED live:
 * unlike a standard remote, `username`/`password` are REQUIRED here (a
 * synchronous 400 without them), not optional advanced fields. */
export interface RpmUlnRemote {
  pulp_href: string;
  name: string;
  url: string;
  policy: RemotePolicy;
  pulp_created: string;
  proxy_url: string | null;
  tls_validation: boolean;
  hidden_fields: HiddenRemoteField[];
  uln_server_base_url: string;
}

export interface RpmUlnRemoteCreate {
  name: string;
  url: string;
  uln_server_base_url: string;
  username: string;
  password: string;
  policy?: RemotePolicy;
}

export interface RpmDistribution {
  pulp_href: string;
  name: string;
  base_path: string;
  base_url: string;
  repository: string | null;
  publication: string | null;
  pulp_created: string;
}

export interface RpmDistributionCreate {
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

export interface RpmPackage {
  pulp_href: string;
  name: string;
  epoch: string;
  version: string;
  release: string;
  arch: string;
  checksum_type: string;
  sha256: string | null;
  size_package: number;
  location_href: string;
}

/** An RPM advisory/errata (security/bugfix/enhancement update). */
export interface RpmAdvisory {
  pulp_href: string;
  id: string;
  title: string;
  /** e.g. "security", "bugfix", "enhancement", "newpackage". */
  type: string;
  /** e.g. "critical", "important", "moderate", "low", or "" if unset. */
  severity: string;
  description: string;
  issued_date: string;
  updated_date: string;
  reboot_suggested: boolean;
  /** Shape isn't fixed by the OpenAPI schema (just "array of object") and
   * this dev instance has no synced advisories to sample - this is the
   * conventional createrepo_c updateinfo reference shape, not independently
   * verified against real data; render defensively. */
  references: { href?: string; id?: string; title?: string; type?: string }[];
}

// --- Read-only, sync-derived content types (VERIFIED against real synced
// data for groups/categories/langpacks; modulemd*/distribution trees/repo
// metadata files have no synced sample in this dev instance - field names
// come from the live OpenAPI schema only, not sampled real data). ---

export interface RpmPackageGroup {
  pulp_href: string;
  id: string;
  name: string;
  description: string;
  default: boolean;
  user_visible: boolean;
  packages: { name: string; type: number }[];
}

export interface RpmPackageCategory {
  pulp_href: string;
  id: string;
  name: string;
  description: string;
  group_ids: { name: string; default: boolean }[];
}

export interface RpmPackageEnvironment {
  pulp_href: string;
  id: string;
  name: string;
  description: string;
  group_ids: { name: string; default: boolean }[];
  option_ids: { name: string; default: boolean }[];
}

export interface RpmPackageLangpacks {
  pulp_href: string;
  /** e.g. {"gorilla-en": "gorilla-%s"} - one content unit per repo version. */
  matches: Record<string, string>;
}

export interface RpmModulemd {
  pulp_href: string;
  name: string;
  stream: string;
  version: string;
  context: string;
  arch: string;
  description: string;
}

export interface RpmModulemdDefaults {
  pulp_href: string;
  module: string;
  stream: string;
}

export interface RpmModulemdObsolete {
  pulp_href: string;
  module_name: string;
  module_stream: string;
  message: string;
  obsoleted_by_module_name: string | null;
  obsoleted_by_module_stream: string | null;
}

export interface RpmDistributionTree {
  pulp_href: string;
  release_name: string;
  release_short: string;
  release_version: string;
  arch: string;
}

export interface RpmRepoMetadataFile {
  pulp_href: string;
  data_type: string;
  relative_path: string;
  checksum_type: string;
}

/** A local "check here before hitting the real remote" mirror source - not
 * repository-scoped, an independent object referencing a remote directly.
 * VERIFIED live: its remote must have `policy: "on_demand"` (a synchronous
 * `400` otherwise), unlike a normal repository sync remote. */
export interface RpmAlternateContentSource {
  pulp_href: string;
  name: string;
  last_refreshed: string | null;
  paths: string[];
  remote: string;
}

export interface RpmAlternateContentSourceCreate {
  name: string;
  remote: string;
  paths?: string[];
}

export interface RpmAlternateContentSourceUpdate {
  name?: string;
  remote?: string;
  paths?: string[];
}
