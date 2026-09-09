// VERIFIED against the live OpenAPI schema of a pulpcore 3.116.1 instance
// with pulp_python installed (component=python - see docs/PULP_API.md and
// the pulp-api skill). Only the fields Pulpit's UI actually reads/writes
// are modeled here.
//
// This plugin has full File/RPM-parity for repository/remote/publish (a
// `remote` + `sync/` on Repository, `autopublish`, a real publication
// endpoint) - but content upload is like maven/npm's, not File's: VERIFIED
// live, `/content/python/packages/` is itself asynchronous (202 + task) and
// accepts an optional `repository` field directly, so it's a one-shot
// upload-and-attach, not a two-step upload-then-modify.
//
// Distribution/publication paths are also a real quirk here: VERIFIED live,
// both live under `.../pypi/`, not `.../python/` (e.g.
// `/pulp/api/v3/distributions/python/pypi/`) - see distributions.ts/
// publications.ts.
//
// Each response/write type below has a paired `AssertFieldsExist` check
// (bottom of file) against the generated schema in
// src/api/generated/python/ (ADR 0004) - a compile error there means this
// hand-written type has drifted from what Pulp's live schema actually has,
// not a runtime bug.

import type { components } from "../../generated/python/schema";
import type { AssertFieldsExist } from "../schemaDriftCheck";

/** Pulp's standard limit/offset pagination envelope. */
export interface PulpPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PythonRepository {
  pulp_href: string;
  name: string;
  description: string | null;
  remote: string | null;
  autopublish: boolean;
  versions_href: string;
  latest_version_href: string;
  pulp_created: string;
}

export interface PythonRepositoryCreate {
  name: string;
  description?: string | null;
  remote?: string | null;
  /** VERIFIED against the live schema: optional, defaults to `false` on Pulp's side. */
  autopublish?: boolean;
}

/** PATCH body - every field optional (partial update). */
export interface PythonRepositoryUpdate {
  name?: string;
  description?: string | null;
  remote?: string | null;
  autopublish?: boolean;
}

export type RemotePolicy = "immediate" | "on_demand" | "streamed";

/** VERIFIED live: proxy_username/proxy_password/username/password are
 * write-only on Pulp's side - a GET response never echoes them back, only
 * whether one is currently set (see `PythonRemote.hidden_fields`). */
export interface HiddenRemoteField {
  name: string;
  is_set: boolean;
}

/** VERIFIED live: the package types pulp_python recognizes on a distribution
 * (matches Python's own wheel/sdist/bdist_* tags). */
export type PythonPackageType =
  | "bdist_dmg"
  | "bdist_dumb"
  | "bdist_egg"
  | "bdist_msi"
  | "bdist_rpm"
  | "bdist_wheel"
  | "bdist_wininst"
  | "sdist";

/** VERIFIED live: platforms `exclude_platforms` can skip. */
export type PythonExcludePlatform = "windows" | "macos" | "freebsd" | "linux";

export interface PythonRemote {
  pulp_href: string;
  name: string;
  url: string;
  policy: RemotePolicy;
  pulp_created: string;
  proxy_url: string | null;
  tls_validation: boolean;
  ca_cert: string | null;
  hidden_fields: HiddenRemoteField[];
  /** Project specifiers (e.g. "django>=4,<5") to include - VERIFIED live: a
   * plain string array, optional (can be absent, not just empty). Absent/empty
   * includes every project. */
  includes?: string[];
  /** Project specifiers to exclude, evaluated after `includes`. */
  excludes?: string[];
  prereleases?: boolean;
  package_types?: PythonPackageType[];
  /** 0 (the API default) keeps every version of a synced package - unlike
   * the other filter fields above, VERIFIED live this one is NOT optional. */
  keep_latest_packages: number;
  exclude_platforms?: PythonExcludePlatform[];
}

/** Advanced connection settings shared by create/update payloads - all
 * optional, standard pulpcore Remote fields (not plugin-specific). Only
 * meaningful as *write* fields - see `PythonRemote.hidden_fields` for why
 * `proxy_username`/`proxy_password`/`username`/`password` have no read-side
 * counterpart. */
export interface PythonRemoteConnectionSettings {
  proxy_url?: string | null;
  proxy_username?: string | null;
  proxy_password?: string | null;
  username?: string | null;
  password?: string | null;
  tls_validation?: boolean;
  ca_cert?: string | null;
}

export interface PythonRemoteCreate extends PythonRemoteConnectionSettings {
  name: string;
  url: string;
  policy?: RemotePolicy;
  includes?: string[];
  excludes?: string[];
  prereleases?: boolean;
  package_types?: PythonPackageType[];
  keep_latest_packages?: number;
  exclude_platforms?: PythonExcludePlatform[];
}

/** PATCH body - every field optional (partial update). */
export interface PythonRemoteUpdate extends PythonRemoteConnectionSettings {
  name?: string;
  url?: string;
  policy?: RemotePolicy;
  includes?: string[];
  excludes?: string[];
  prereleases?: boolean;
  package_types?: PythonPackageType[];
  keep_latest_packages?: number;
  exclude_platforms?: PythonExcludePlatform[];
}

export interface PythonDistribution {
  pulp_href: string;
  name: string;
  base_path: string;
  base_url: string;
  repository: string | null;
  publication: string | null;
  pulp_created: string;
}

export interface PythonDistributionCreate {
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

/** A single Python package (wheel/sdist) - VERIFIED live: `relative_path`
 * is required on *upload* but isn't echoed back in the response; identity
 * on read is `name`/`version`/`filename`/`packagetype`, parsed server-side
 * from the uploaded file's own package metadata. */
export interface PythonContent {
  pulp_href: string;
  name: string | null;
  version: string | null;
  filename: string | null;
  packagetype: string | null;
}

// --- Schema drift checks (see schemaDriftCheck.ts) --------------------------
//
// One entry per hand-written type above, each checked against its matching
// generated schema component. A compile error on a `true` below - "Type
// 'true' is not assignable to type 'never'" - names (via the property key)
// exactly which hand-written type has a field the live schema no longer
// has; re-verify that one type, not the others.
type _PythonSchemaDriftChecks = {
  PythonRepository: AssertFieldsExist<
    components["schemas"]["python.PythonRepositoryResponse"],
    PythonRepository
  >;
  PythonRepositoryCreate: AssertFieldsExist<
    components["schemas"]["python.PythonRepository"],
    PythonRepositoryCreate
  >;
  PythonRepositoryUpdate: AssertFieldsExist<
    components["schemas"]["Patchedpython.PythonRepository"],
    PythonRepositoryUpdate
  >;
  PythonRemote: AssertFieldsExist<
    components["schemas"]["python.PythonRemoteResponse"],
    PythonRemote
  >;
  PythonRemoteCreate: AssertFieldsExist<
    components["schemas"]["python.PythonRemote"],
    PythonRemoteCreate
  >;
  PythonRemoteUpdate: AssertFieldsExist<
    components["schemas"]["Patchedpython.PythonRemote"],
    PythonRemoteUpdate
  >;
  PythonDistribution: AssertFieldsExist<
    components["schemas"]["python.PythonDistributionResponse"],
    PythonDistribution
  >;
  PythonDistributionCreate: AssertFieldsExist<
    components["schemas"]["python.PythonDistribution"],
    PythonDistributionCreate
  >;
  ContentSummary: AssertFieldsExist<
    components["schemas"]["ContentSummaryResponse"],
    ContentSummary
  >;
  RepositoryVersion: AssertFieldsExist<
    components["schemas"]["RepositoryVersionResponse"],
    RepositoryVersion
  >;
  PythonContent: AssertFieldsExist<
    components["schemas"]["python.PythonPackageContentResponse"],
    PythonContent
  >;
};
// Type-only checkpoint (not exported, not read anywhere else) - its only
// purpose is for the object literal below to fail to compile on drift.
const _pythonSchemaDriftChecks: _PythonSchemaDriftChecks = {
  PythonRepository: true,
  PythonRepositoryCreate: true,
  PythonRepositoryUpdate: true,
  PythonRemote: true,
  PythonRemoteCreate: true,
  PythonRemoteUpdate: true,
  PythonDistribution: true,
  PythonDistributionCreate: true,
  ContentSummary: true,
  RepositoryVersion: true,
  PythonContent: true,
};
void _pythonSchemaDriftChecks;
