// VERIFIED against the live OpenAPI schema of a pulpcore 3.116.1 instance
// with pulp_deb installed (component=deb - see docs/PULP_API.md and the
// pulp-api skill). Only the fields Pulpit's UI actually reads/writes are
// modeled here.
//
// This plugin has full File/RPM-parity for repository/remote/publish (a
// `remote` + `sync/` on Repository, `autopublish`, a real publication
// endpoint) - but every path segment here is `apt`, not `deb` (matching
// pulp_deb's own naming: `/repositories/deb/apt/`, `/remotes/deb/apt/`,
// `/distributions/deb/apt/`, `/publications/deb/apt/`). There's a second,
// verbatim publication type (`/publications/deb/verbatim/`) - deliberately
// unsupported here, same as this app's other skip-the-advanced-variant
// calls (e.g. RPM's alternate content sources).
//
// The one REQUIRED field beyond every other plugin's remote here is
// `distributions` (VERIFIED live: a single whitespace-separated string, not
// an array) - pulp_deb has no way to sync without knowing which
// distribution(s) (roughly: release codenames) to fetch.
//
// Content upload is like maven/npm/python's, not File's: VERIFIED live,
// `/content/deb/packages/` is itself asynchronous (202 + task) and accepts
// an optional `repository` field directly, so it's a one-shot
// upload-and-attach, not a two-step upload-then-modify. Only the primary
// `deb.Package` content type is modeled - pulp_deb has many secondary
// content types (source packages, installer packages, release/index
// metadata, generic content) deliberately out of scope here, same as this
// app's other "skip secondary content sub-types" calls.
//
// Each response/write type below has a paired `AssertFieldsExist` check
// (bottom of file) against the generated schema in src/api/generated/deb/
// (ADR 0004) - a compile error there means this hand-written type has
// drifted from what Pulp's live schema actually has, not a runtime bug.

import type { components } from "../../generated/deb/schema";
import type { AssertFieldsExist } from "../schemaDriftCheck";

/** Pulp's standard limit/offset pagination envelope. */
export interface PulpPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DebRepository {
  pulp_href: string;
  name: string;
  description: string | null;
  remote: string | null;
  autopublish: boolean;
  versions_href: string;
  latest_version_href: string;
  pulp_created: string;
}

export interface DebRepositoryCreate {
  name: string;
  description?: string | null;
  remote?: string | null;
  /** VERIFIED against the live schema: optional, defaults to `false` on Pulp's side. */
  autopublish?: boolean;
}

/** PATCH body - every field optional (partial update). */
export interface DebRepositoryUpdate {
  name?: string;
  description?: string | null;
  remote?: string | null;
  autopublish?: boolean;
}

export type RemotePolicy = "immediate" | "on_demand" | "streamed";

/** VERIFIED live: proxy_username/proxy_password/username/password are
 * write-only on Pulp's side - a GET response never echoes them back, only
 * whether one is currently set (see `DebRemote.hidden_fields`). */
export interface HiddenRemoteField {
  name: string;
  is_set: boolean;
}

export interface DebRemote {
  pulp_href: string;
  name: string;
  url: string;
  policy: RemotePolicy;
  /** Whitespace-separated release codenames/suites to sync (VERIFIED live:
   * a plain string, not an array) - required, this plugin has no way to
   * sync without knowing which distribution(s) to fetch. */
  distributions: string;
  pulp_created: string;
  proxy_url: string | null;
  tls_validation: boolean;
  ca_cert: string | null;
  hidden_fields: HiddenRemoteField[];
}

/** Advanced connection settings shared by create/update payloads - all
 * optional, standard pulpcore Remote fields (not plugin-specific). Only
 * meaningful as *write* fields - see `DebRemote.hidden_fields` for why
 * `proxy_username`/`proxy_password`/`username`/`password` have no read-side
 * counterpart. */
export interface DebRemoteConnectionSettings {
  proxy_url?: string | null;
  proxy_username?: string | null;
  proxy_password?: string | null;
  username?: string | null;
  password?: string | null;
  tls_validation?: boolean;
  ca_cert?: string | null;
}

export interface DebRemoteCreate extends DebRemoteConnectionSettings {
  name: string;
  url: string;
  distributions: string;
  policy?: RemotePolicy;
}

/** PATCH body - every field optional (partial update), except `distributions`
 * stays required-in-spirit here (an empty value would leave the remote
 * unable to sync) - kept optional in the type since PATCH is a partial
 * update, but the edit form always sends the current value. */
export interface DebRemoteUpdate extends DebRemoteConnectionSettings {
  name?: string;
  url?: string;
  distributions?: string;
  policy?: RemotePolicy;
}

export interface DebDistribution {
  pulp_href: string;
  name: string;
  base_path: string;
  base_url: string;
  repository: string | null;
  publication: string | null;
  pulp_created: string;
}

export interface DebDistributionCreate {
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

/** A single .deb binary package - VERIFIED live: `relative_path` is
 * optional on *upload* (unlike maven/npm/python's required one) but this
 * app collects it anyway, for the same predictable-placement reasons as
 * every other plugin's upload form. Identity on read is
 * `package`/`version`/`architecture`. */
export interface DebContent {
  pulp_href: string;
  package: string | null;
  version: string | null;
  architecture: string | null;
}

// --- Schema drift checks (see schemaDriftCheck.ts) --------------------------
//
// One entry per hand-written type above, each checked against its matching
// generated schema component. A compile error on a `true` below - "Type
// 'true' is not assignable to type 'never'" - names (via the property key)
// exactly which hand-written type has a field the live schema no longer
// has; re-verify that one type, not the others.
type _DebSchemaDriftChecks = {
  DebRepository: AssertFieldsExist<
    components["schemas"]["deb.AptRepositoryResponse"],
    DebRepository
  >;
  DebRepositoryCreate: AssertFieldsExist<
    components["schemas"]["deb.AptRepository"],
    DebRepositoryCreate
  >;
  DebRepositoryUpdate: AssertFieldsExist<
    components["schemas"]["Patcheddeb.AptRepository"],
    DebRepositoryUpdate
  >;
  DebRemote: AssertFieldsExist<components["schemas"]["deb.AptRemoteResponse"], DebRemote>;
  DebRemoteCreate: AssertFieldsExist<
    components["schemas"]["deb.AptRemote"],
    DebRemoteCreate
  >;
  DebRemoteUpdate: AssertFieldsExist<
    components["schemas"]["Patcheddeb.AptRemote"],
    DebRemoteUpdate
  >;
  DebDistribution: AssertFieldsExist<
    components["schemas"]["deb.AptDistributionResponse"],
    DebDistribution
  >;
  DebDistributionCreate: AssertFieldsExist<
    components["schemas"]["deb.AptDistribution"],
    DebDistributionCreate
  >;
  ContentSummary: AssertFieldsExist<
    components["schemas"]["ContentSummaryResponse"],
    ContentSummary
  >;
  RepositoryVersion: AssertFieldsExist<
    components["schemas"]["RepositoryVersionResponse"],
    RepositoryVersion
  >;
  DebContent: AssertFieldsExist<components["schemas"]["deb.PackageResponse"], DebContent>;
};
// Type-only checkpoint (not exported, not read anywhere else) - its only
// purpose is for the object literal below to fail to compile on drift.
const _debSchemaDriftChecks: _DebSchemaDriftChecks = {
  DebRepository: true,
  DebRepositoryCreate: true,
  DebRepositoryUpdate: true,
  DebRemote: true,
  DebRemoteCreate: true,
  DebRemoteUpdate: true,
  DebDistribution: true,
  DebDistributionCreate: true,
  ContentSummary: true,
  RepositoryVersion: true,
  DebContent: true,
};
void _debSchemaDriftChecks;
