// VERIFIED against the live OpenAPI schema of a pulpcore 3.116.1 instance
// with pulp_maven installed (component=maven - see docs/PULP_API.md and the
// pulp-api skill). Only the fields Pulpit's UI actually reads/writes are
// modeled here.
//
// This plugin is structurally different from every other one in this app:
// pulp_maven is primarily a pull-through caching proxy, not a sync/publish
// pipeline. VERIFIED live consequences:
//  - MavenRepository has NO `remote` field at all, and there is NO
//    `sync/` action endpoint on it - content only ever gets in via direct
//    upload (see MavenContent below).
//  - There is NO publication endpoint for this plugin at all - a
//    distribution serves a repository's latest version directly (or, for
//    pull-through caching, a remote directly - see MavenDistribution).
//
// Each response/write type below has a paired `AssertFieldsExist` check
// (bottom of file) against the generated schema in src/api/generated/maven/
// (ADR 0004) - a compile error there means this hand-written type has
// drifted from what Pulp's live schema actually has, not a runtime bug.

import type { components } from "../../generated/maven/schema";
import type { AssertFieldsExist } from "../schemaDriftCheck";

/** Pulp's standard limit/offset pagination envelope. */
export interface PulpPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MavenRepository {
  pulp_href: string;
  name: string;
  description: string | null;
  versions_href: string;
  latest_version_href: string;
  pulp_created: string;
}

export interface MavenRepositoryCreate {
  name: string;
  description?: string | null;
}

/** PATCH body - every field optional (partial update). */
export interface MavenRepositoryUpdate {
  name?: string;
  description?: string | null;
}

export type RemotePolicy = "immediate" | "on_demand" | "streamed";

/** VERIFIED live: proxy_username/proxy_password/username/password are
 * write-only on Pulp's side - a GET response never echoes them back, only
 * whether one is currently set (see `MavenRemote.hidden_fields`). */
export interface HiddenRemoteField {
  name: string;
  is_set: boolean;
}

export interface MavenRemote {
  pulp_href: string;
  name: string;
  url: string;
  policy: RemotePolicy;
  pulp_created: string;
  proxy_url: string | null;
  tls_validation: boolean;
  ca_cert: string | null;
  hidden_fields: HiddenRemoteField[];
}

/** Advanced connection settings shared by create/update payloads - all
 * optional, standard pulpcore Remote fields (not plugin-specific). Only
 * meaningful as *write* fields - see `MavenRemote.hidden_fields` for why
 * `proxy_username`/`proxy_password`/`username`/`password` have no read-side
 * counterpart. */
export interface MavenRemoteConnectionSettings {
  proxy_url?: string | null;
  proxy_username?: string | null;
  proxy_password?: string | null;
  username?: string | null;
  password?: string | null;
  tls_validation?: boolean;
  ca_cert?: string | null;
}

export interface MavenRemoteCreate extends MavenRemoteConnectionSettings {
  name: string;
  url: string;
  policy?: RemotePolicy;
}

/** PATCH body - every field optional (partial update). */
export interface MavenRemoteUpdate extends MavenRemoteConnectionSettings {
  name?: string;
  url?: string;
  policy?: RemotePolicy;
}

export interface MavenDistribution {
  pulp_href: string;
  name: string;
  base_path: string;
  base_url: string;
  repository: string | null;
  /** Pull-through cache source - VERIFIED live: unlike every other plugin's
   * distribution, this one can proxy a remote directly instead of (or in
   * addition to) serving a repository's content. */
  remote: string | null;
  pulp_created: string;
}

export interface MavenDistributionCreate {
  name: string;
  base_path: string;
  repository?: string | null;
  remote?: string | null;
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

/** A single Maven artifact (jar/pom/etc.) - VERIFIED live: `relative_path`
 * is required on *upload* but isn't echoed back in the response; identity
 * on read is `group_id`/`artifact_id`/`version`/`filename`, parsed
 * server-side from the uploaded file's Maven coordinates. */
export interface MavenContent {
  pulp_href: string;
  group_id: string | null;
  artifact_id: string | null;
  version: string | null;
  filename: string | null;
}

// --- Schema drift checks (see schemaDriftCheck.ts) --------------------------
//
// One entry per hand-written type above, each checked against its matching
// generated schema component. A compile error on a `true` below - "Type
// 'true' is not assignable to type 'never'" - names (via the property key)
// exactly which hand-written type has a field the live schema no longer
// has; re-verify that one type, not the others.
type _MavenSchemaDriftChecks = {
  MavenRepository: AssertFieldsExist<
    components["schemas"]["maven.MavenRepositoryResponse"],
    MavenRepository
  >;
  MavenRepositoryCreate: AssertFieldsExist<
    components["schemas"]["maven.MavenRepository"],
    MavenRepositoryCreate
  >;
  MavenRepositoryUpdate: AssertFieldsExist<
    components["schemas"]["Patchedmaven.MavenRepository"],
    MavenRepositoryUpdate
  >;
  MavenRemote: AssertFieldsExist<
    components["schemas"]["maven.MavenRemoteResponse"],
    MavenRemote
  >;
  MavenRemoteCreate: AssertFieldsExist<
    components["schemas"]["maven.MavenRemote"],
    MavenRemoteCreate
  >;
  MavenRemoteUpdate: AssertFieldsExist<
    components["schemas"]["Patchedmaven.MavenRemote"],
    MavenRemoteUpdate
  >;
  MavenDistribution: AssertFieldsExist<
    components["schemas"]["maven.MavenDistributionResponse"],
    MavenDistribution
  >;
  MavenDistributionCreate: AssertFieldsExist<
    components["schemas"]["maven.MavenDistribution"],
    MavenDistributionCreate
  >;
  ContentSummary: AssertFieldsExist<
    components["schemas"]["ContentSummaryResponse"],
    ContentSummary
  >;
  RepositoryVersion: AssertFieldsExist<
    components["schemas"]["RepositoryVersionResponse"],
    RepositoryVersion
  >;
  MavenContent: AssertFieldsExist<
    components["schemas"]["maven.MavenArtifactResponse"],
    MavenContent
  >;
};
// Type-only checkpoint (not exported, not read anywhere else) - its only
// purpose is for the object literal below to fail to compile on drift.
const _mavenSchemaDriftChecks: _MavenSchemaDriftChecks = {
  MavenRepository: true,
  MavenRepositoryCreate: true,
  MavenRepositoryUpdate: true,
  MavenRemote: true,
  MavenRemoteCreate: true,
  MavenRemoteUpdate: true,
  MavenDistribution: true,
  MavenDistributionCreate: true,
  ContentSummary: true,
  RepositoryVersion: true,
  MavenContent: true,
};
void _mavenSchemaDriftChecks;
