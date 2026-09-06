// VERIFIED against the live OpenAPI schema of a pulpcore 3.116.1 instance
// with pulp_npm installed (component=npm - see docs/PULP_API.md and the
// pulp-api skill). Only the fields Pulpit's UI actually reads/writes are
// modeled here.
//
// Unlike gem/hugging_face, this plugin's Repository DOES have a `remote`
// field and a `sync/` action (VERIFIED live) - but like maven, there is NO
// publication endpoint for this plugin at all: a distribution serves a
// repository's latest version directly, with no publish step. Also like
// maven, a distribution can additionally proxy a remote directly for
// pull-through caching, independent of a repository's synced content.
//
// Each response/write type below has a paired `AssertFieldsExist` check
// (bottom of file) against the generated schema in src/api/generated/npm/
// (ADR 0004) - a compile error there means this hand-written type has
// drifted from what Pulp's live schema actually has, not a runtime bug.

import type { components } from "../../generated/npm/schema";
import type { AssertFieldsExist } from "../schemaDriftCheck";

/** Pulp's standard limit/offset pagination envelope. */
export interface PulpPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface NpmRepository {
  pulp_href: string;
  name: string;
  description: string | null;
  remote: string | null;
  versions_href: string;
  latest_version_href: string;
  pulp_created: string;
}

export interface NpmRepositoryCreate {
  name: string;
  description?: string | null;
  remote?: string | null;
}

/** PATCH body - every field optional (partial update). */
export interface NpmRepositoryUpdate {
  name?: string;
  description?: string | null;
  remote?: string | null;
}

export type RemotePolicy = "immediate" | "on_demand" | "streamed";

/** VERIFIED live: proxy_username/proxy_password/username/password are
 * write-only on Pulp's side - a GET response never echoes them back, only
 * whether one is currently set (see `NpmRemote.hidden_fields`). */
export interface HiddenRemoteField {
  name: string;
  is_set: boolean;
}

export interface NpmRemote {
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
 * meaningful as *write* fields - see `NpmRemote.hidden_fields` for why
 * `proxy_username`/`proxy_password`/`username`/`password` have no read-side
 * counterpart. */
export interface NpmRemoteConnectionSettings {
  proxy_url?: string | null;
  proxy_username?: string | null;
  proxy_password?: string | null;
  username?: string | null;
  password?: string | null;
  tls_validation?: boolean;
  ca_cert?: string | null;
}

export interface NpmRemoteCreate extends NpmRemoteConnectionSettings {
  name: string;
  url: string;
  policy?: RemotePolicy;
}

/** PATCH body - every field optional (partial update). */
export interface NpmRemoteUpdate extends NpmRemoteConnectionSettings {
  name?: string;
  url?: string;
  policy?: RemotePolicy;
}

export interface NpmDistribution {
  pulp_href: string;
  name: string;
  base_path: string;
  base_url: string;
  repository: string | null;
  /** Pull-through cache source - VERIFIED live: like maven (and unlike
   * every sync/publish plugin in this app), this distribution can proxy a
   * remote directly instead of (or in addition to) serving a repository's
   * content. */
  remote: string | null;
  pulp_created: string;
}

export interface NpmDistributionCreate {
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

/** A single npm package tarball - VERIFIED live: unlike maven, this
 * plugin's response *does* echo back `relative_path`, alongside the
 * package's own `name`/`version`. */
export interface NpmContent {
  pulp_href: string;
  relative_path: string | null;
  name: string | null;
  version: string | null;
}

// --- Schema drift checks (see schemaDriftCheck.ts) --------------------------
//
// One entry per hand-written type above, each checked against its matching
// generated schema component. A compile error on a `true` below - "Type
// 'true' is not assignable to type 'never'" - names (via the property key)
// exactly which hand-written type has a field the live schema no longer
// has; re-verify that one type, not the others.
type _NpmSchemaDriftChecks = {
  NpmRepository: AssertFieldsExist<
    components["schemas"]["npm.NpmRepositoryResponse"],
    NpmRepository
  >;
  NpmRepositoryCreate: AssertFieldsExist<
    components["schemas"]["npm.NpmRepository"],
    NpmRepositoryCreate
  >;
  NpmRepositoryUpdate: AssertFieldsExist<
    components["schemas"]["Patchednpm.NpmRepository"],
    NpmRepositoryUpdate
  >;
  NpmRemote: AssertFieldsExist<components["schemas"]["npm.NpmRemoteResponse"], NpmRemote>;
  NpmRemoteCreate: AssertFieldsExist<
    components["schemas"]["npm.NpmRemote"],
    NpmRemoteCreate
  >;
  NpmRemoteUpdate: AssertFieldsExist<
    components["schemas"]["Patchednpm.NpmRemote"],
    NpmRemoteUpdate
  >;
  NpmDistribution: AssertFieldsExist<
    components["schemas"]["npm.NpmDistributionResponse"],
    NpmDistribution
  >;
  NpmDistributionCreate: AssertFieldsExist<
    components["schemas"]["npm.NpmDistribution"],
    NpmDistributionCreate
  >;
  ContentSummary: AssertFieldsExist<
    components["schemas"]["ContentSummaryResponse"],
    ContentSummary
  >;
  RepositoryVersion: AssertFieldsExist<
    components["schemas"]["RepositoryVersionResponse"],
    RepositoryVersion
  >;
  NpmContent: AssertFieldsExist<components["schemas"]["npm.PackageResponse"], NpmContent>;
};
// Type-only checkpoint (not exported, not read anywhere else) - its only
// purpose is for the object literal below to fail to compile on drift.
const _npmSchemaDriftChecks: _NpmSchemaDriftChecks = {
  NpmRepository: true,
  NpmRepositoryCreate: true,
  NpmRepositoryUpdate: true,
  NpmRemote: true,
  NpmRemoteCreate: true,
  NpmRemoteUpdate: true,
  NpmDistribution: true,
  NpmDistributionCreate: true,
  ContentSummary: true,
  RepositoryVersion: true,
  NpmContent: true,
};
void _npmSchemaDriftChecks;
