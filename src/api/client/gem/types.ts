// VERIFIED against the live OpenAPI schema of a pulpcore 3.116.1 instance
// with pulp_gem installed (component=gem - see docs/PULP_API.md and the
// pulp-api skill). Only the fields Pulpit's UI actually reads/writes are
// modeled here.
//
// Each response/write type below has a paired `AssertFieldsExist` check
// (bottom of file) against the generated schema in src/api/generated/gem/
// (ADR 0004) - a compile error there means this hand-written type has
// drifted from what Pulp's live schema actually has, not a runtime bug.

import type { components } from "../../generated/gem/schema";
import type { AssertFieldsExist } from "../schemaDriftCheck";

/** Pulp's standard limit/offset pagination envelope. */
export interface PulpPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// VERIFIED live: unlike RPM/File/Python, this plugin's Repository has no
// `autopublish` field at all - a gem repository must always be published
// manually (see usePublishGemRepositoryMutation).
export interface GemRepository {
  pulp_href: string;
  name: string;
  description: string | null;
  remote: string | null;
  versions_href: string;
  latest_version_href: string;
  pulp_created: string;
}

export interface GemRepositoryCreate {
  name: string;
  description?: string | null;
  remote?: string | null;
}

/** PATCH body - every field optional (partial update). */
export interface GemRepositoryUpdate {
  name?: string;
  description?: string | null;
  remote?: string | null;
}

export type RemotePolicy = "immediate" | "on_demand" | "streamed";

/** VERIFIED live: proxy_username/proxy_password/username/password are
 * write-only on Pulp's side - a GET response never echoes them back, only
 * whether one is currently set (see `GemRemote.hidden_fields`). */
export interface HiddenRemoteField {
  name: string;
  is_set: boolean;
}

export interface GemRemote {
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
 * meaningful as *write* fields - see `GemRemote.hidden_fields` for why
 * `proxy_username`/`proxy_password`/`username`/`password` have no read-side
 * counterpart. */
export interface GemRemoteConnectionSettings {
  proxy_url?: string | null;
  proxy_username?: string | null;
  proxy_password?: string | null;
  username?: string | null;
  password?: string | null;
  tls_validation?: boolean;
  ca_cert?: string | null;
}

export interface GemRemoteCreate extends GemRemoteConnectionSettings {
  name: string;
  url: string;
  policy?: RemotePolicy;
}

/** PATCH body - every field optional (partial update). */
export interface GemRemoteUpdate extends GemRemoteConnectionSettings {
  name?: string;
  url?: string;
  policy?: RemotePolicy;
}

export interface GemDistribution {
  pulp_href: string;
  name: string;
  base_path: string;
  base_url: string;
  repository: string | null;
  publication: string | null;
  pulp_created: string;
}

export interface GemDistributionCreate {
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

/** A single .gem file - VERIFIED live: unlike File/Python/Maven, there is
 * no `relative_path` at all here - a gem's identity comes entirely from its
 * own embedded metadata (name/version/platform), parsed server-side from
 * the uploaded file itself. */
export interface GemContent {
  pulp_href: string;
  name: string | null;
  version: string | null;
  platform: string | null;
}

// --- Schema drift checks (see schemaDriftCheck.ts) --------------------------
//
// One entry per hand-written type above, each checked against its matching
// generated schema component. A compile error on a `true` below - "Type
// 'true' is not assignable to type 'never'" - names (via the property key)
// exactly which hand-written type has a field the live schema no longer
// has; re-verify that one type, not the others.
type _GemSchemaDriftChecks = {
  GemRepository: AssertFieldsExist<
    components["schemas"]["gem.GemRepositoryResponse"],
    GemRepository
  >;
  GemRepositoryCreate: AssertFieldsExist<
    components["schemas"]["gem.GemRepository"],
    GemRepositoryCreate
  >;
  GemRepositoryUpdate: AssertFieldsExist<
    components["schemas"]["Patchedgem.GemRepository"],
    GemRepositoryUpdate
  >;
  GemRemote: AssertFieldsExist<components["schemas"]["gem.GemRemoteResponse"], GemRemote>;
  GemRemoteCreate: AssertFieldsExist<
    components["schemas"]["gem.GemRemote"],
    GemRemoteCreate
  >;
  GemRemoteUpdate: AssertFieldsExist<
    components["schemas"]["Patchedgem.GemRemote"],
    GemRemoteUpdate
  >;
  GemDistribution: AssertFieldsExist<
    components["schemas"]["gem.GemDistributionResponse"],
    GemDistribution
  >;
  GemDistributionCreate: AssertFieldsExist<
    components["schemas"]["gem.GemDistribution"],
    GemDistributionCreate
  >;
  ContentSummary: AssertFieldsExist<
    components["schemas"]["ContentSummaryResponse"],
    ContentSummary
  >;
  RepositoryVersion: AssertFieldsExist<
    components["schemas"]["RepositoryVersionResponse"],
    RepositoryVersion
  >;
  GemContent: AssertFieldsExist<
    components["schemas"]["gem.GemContentResponse"],
    GemContent
  >;
};
// Type-only checkpoint (not exported, not read anywhere else) - its only
// purpose is for the object literal below to fail to compile on drift.
const _gemSchemaDriftChecks: _GemSchemaDriftChecks = {
  GemRepository: true,
  GemRepositoryCreate: true,
  GemRepositoryUpdate: true,
  GemRemote: true,
  GemRemoteCreate: true,
  GemRemoteUpdate: true,
  GemDistribution: true,
  GemDistributionCreate: true,
  ContentSummary: true,
  RepositoryVersion: true,
  GemContent: true,
};
void _gemSchemaDriftChecks;
