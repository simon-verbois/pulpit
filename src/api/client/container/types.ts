// VERIFIED against the live OpenAPI schema of a pulpcore 3.116.0 / pulp_container
// 2.29.0 instance (fetched from /pulp/api/v3/docs/api.json?component=container -
// see docs/PULP_API.md "Container endpoints"). Only the fields Pulpit's UI
// actually reads/writes are modeled here. Reuses RPM's `PulpPage`/`RemotePolicy`
// shape conventions - see src/api/client/rpm/types.ts.
//
// Each response/write type below has a paired `AssertFieldsExist` check
// (bottom of file) against the generated schema in
// src/api/generated/container/ (ADR 0004) - a compile error there means
// this hand-written type has drifted from what Pulp's live schema actually
// has, not a runtime bug.

import type { components } from "../../generated/container/schema";
import type { AssertFieldsExist } from "../schemaDriftCheck";

export interface PulpPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type RemotePolicy = "immediate" | "on_demand" | "streamed";

/** VERIFIED live: same write-only-credentials pattern as RPM/Ansible remotes
 * (see docs/PULP_API.md) - a GET never echoes back a password/token, only
 * whether one `is_set`. */
export interface HiddenRemoteField {
  name: string;
  is_set: boolean;
}

/**
 * Only the sync-source "container" remote flavor is modeled here - pull-through
 * caching remotes (`remotes/container/pull-through/`) are a distinct, more
 * advanced feature (proxy-cache a registry on first pull) out of this
 * milestone's scope (see docs/ROADMAP.md Milestone 3).
 */
export interface ContainerRemote {
  pulp_href: string;
  name: string;
  url: string;
  /** The actual repository name on the *remote* registry (e.g. "library/busybox")
   * - VERIFIED required, distinct from Pulpit's own `name` for the remote object,
   * unlike RPM/Ansible remotes which have no equivalent field. */
  upstream_name: string;
  policy: RemotePolicy;
  pulp_created: string;
  proxy_url: string | null;
  tls_validation: boolean;
  hidden_fields: HiddenRemoteField[];
  /** Glob patterns (e.g. "latest", "v1.*") limiting which tags get synced -
   * VERIFIED live: `null`/omitted means "sync every tag". The live schema
   * ALSO has `include_tags`/`exclude_tags` fields, but VERIFIED live those
   * are write-only legacy aliases for these same two fields (they show up
   * in `hidden_fields`, always `is_set: false`, while a value posted to
   * `include_tags` comes back under `includes`) - `includes`/`excludes`
   * are the real, current field names to both read and write. */
  includes: string[] | null;
  excludes: string[] | null;
}

export interface ContainerRemoteConnectionSettings {
  proxy_url?: string | null;
  proxy_username?: string | null;
  proxy_password?: string | null;
  username?: string | null;
  password?: string | null;
  tls_validation?: boolean;
}

export interface ContainerRemoteCreate extends ContainerRemoteConnectionSettings {
  name: string;
  url: string;
  upstream_name: string;
  policy?: RemotePolicy;
  includes?: string[];
  excludes?: string[];
}

/** PATCH body - every field optional (partial update). */
export interface ContainerRemoteUpdate extends ContainerRemoteConnectionSettings {
  name?: string;
  url?: string;
  upstream_name?: string;
  policy?: RemotePolicy;
  includes?: string[];
  excludes?: string[];
}

/**
 * The sync-source "container" repository flavor - VERIFIED live schema has
 * **no `publication` concept at all** (like Ansible, unlike RPM): a
 * distribution serves a repository/repository version directly. The
 * separate `container-push` repository flavor (auto-created by a real
 * `docker/podman push`) is read/tag-management only in this milestone, not
 * full CRUD - see ContainerPushRepository below.
 */
export interface ContainerRepository {
  pulp_href: string;
  name: string;
  description: string | null;
  remote: string | null;
  retain_repo_versions: number | null;
  versions_href: string;
  latest_version_href: string;
  pulp_created: string;
}

export interface ContainerRepositoryCreate {
  name: string;
  description?: string | null;
  remote?: string | null;
  retain_repo_versions?: number | null;
}

/** PATCH body - every field optional (partial update). */
export interface ContainerRepositoryUpdate {
  name?: string;
  description?: string | null;
  remote?: string | null;
  retain_repo_versions?: number | null;
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

export interface ContainerDistribution {
  pulp_href: string;
  name: string;
  base_path: string;
  repository: string | null;
  repository_version: string | null;
  private: boolean;
  description: string | null;
  /** VERIFIED live: the actual `<registry>/<base_path>` pull address a
   * podman/docker client would use - distinct from Ansible's `client_url`
   * (a full URL) and RPM's `base_url` in shape, but the same idea: the
   * one field that makes "Registry UX" possible without hand-building it. */
  registry_path: string;
}

export interface ContainerDistributionCreate {
  name: string;
  base_path: string;
  repository?: string | null;
  private?: boolean;
}

export interface ContainerTag {
  pulp_href: string;
  name: string;
  tagged_manifest: string;
  pulp_created: string;
}

export interface ContainerManifest {
  pulp_href: string;
  digest: string;
  schema_version: number;
  media_type: string;
  architecture: string | null;
  os: string | null;
  compressed_image_size: number | null;
  pulp_created: string;
}

/** Read/tag-management only - see ContainerRepository's doc comment. */
export interface ContainerPushRepository {
  pulp_href: string;
  name: string;
  description: string | null;
  latest_version_href: string;
  pulp_created: string;
}

// --- Schema drift checks (see schemaDriftCheck.ts) --------------------------
type _ContainerSchemaDriftChecks = {
  ContainerRemote: AssertFieldsExist<
    components["schemas"]["container.ContainerRemoteResponse"],
    ContainerRemote
  >;
  ContainerRemoteCreate: AssertFieldsExist<
    components["schemas"]["container.ContainerRemote"],
    ContainerRemoteCreate
  >;
  ContainerRemoteUpdate: AssertFieldsExist<
    components["schemas"]["Patchedcontainer.ContainerRemote"],
    ContainerRemoteUpdate
  >;
  ContainerRepository: AssertFieldsExist<
    components["schemas"]["container.ContainerRepositoryResponse"],
    ContainerRepository
  >;
  ContainerRepositoryCreate: AssertFieldsExist<
    components["schemas"]["container.ContainerRepository"],
    ContainerRepositoryCreate
  >;
  ContainerRepositoryUpdate: AssertFieldsExist<
    components["schemas"]["Patchedcontainer.ContainerRepository"],
    ContainerRepositoryUpdate
  >;
  ContentSummary: AssertFieldsExist<
    components["schemas"]["ContentSummaryResponse"],
    ContentSummary
  >;
  RepositoryVersion: AssertFieldsExist<
    components["schemas"]["RepositoryVersionResponse"],
    RepositoryVersion
  >;
  ContainerDistribution: AssertFieldsExist<
    components["schemas"]["container.ContainerDistributionResponse"],
    ContainerDistribution
  >;
  ContainerDistributionCreate: AssertFieldsExist<
    components["schemas"]["container.ContainerDistribution"],
    ContainerDistributionCreate
  >;
  ContainerTag: AssertFieldsExist<
    components["schemas"]["container.TagResponse"],
    ContainerTag
  >;
  ContainerManifest: AssertFieldsExist<
    components["schemas"]["container.ManifestResponse"],
    ContainerManifest
  >;
  ContainerPushRepository: AssertFieldsExist<
    components["schemas"]["container.ContainerPushRepositoryResponse"],
    ContainerPushRepository
  >;
};
const _containerSchemaDriftChecks: _ContainerSchemaDriftChecks = {
  ContainerRemote: true,
  ContainerRemoteCreate: true,
  ContainerRemoteUpdate: true,
  ContainerRepository: true,
  ContainerRepositoryCreate: true,
  ContainerRepositoryUpdate: true,
  ContentSummary: true,
  RepositoryVersion: true,
  ContainerDistribution: true,
  ContainerDistributionCreate: true,
  ContainerTag: true,
  ContainerManifest: true,
  ContainerPushRepository: true,
};
void _containerSchemaDriftChecks;
