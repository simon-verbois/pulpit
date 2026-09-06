// VERIFIED against the live OpenAPI schema of a pulpcore 3.116.0 / pulp_file
// instance (fetched from /pulp/api/v3/docs/api.json?component=file - see
// docs/PULP_API.md and the pulp-api skill). Only the fields Pulpit's UI
// actually reads/writes are modeled here.
//
// Each response/write type below has a paired `AssertFieldsExist` check
// (bottom of file) against the generated schema in src/api/generated/file/
// (ADR 0004) - a compile error there means this hand-written type has
// drifted from what Pulp's live schema actually has, not a runtime bug.

import type { components } from "../../generated/file/schema";
import type { AssertFieldsExist } from "../schemaDriftCheck";

/** Pulp's standard limit/offset pagination envelope. */
export interface PulpPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface FileRepository {
  pulp_href: string;
  name: string;
  description: string | null;
  remote: string | null;
  autopublish: boolean;
  /** Filename used for the PULP_MANIFEST-style listing a publication
   * writes (VERIFIED live: nullable, server defaults to "PULP_MANIFEST"
   * when never set). */
  manifest: string | null;
  versions_href: string;
  latest_version_href: string;
  pulp_created: string;
}

export interface FileRepositoryCreate {
  name: string;
  description?: string | null;
  remote?: string | null;
  /** VERIFIED against the live schema: optional, defaults to `false` on Pulp's side. */
  autopublish?: boolean;
  manifest?: string | null;
}

/** PATCH body - every field optional (partial update). */
export interface FileRepositoryUpdate {
  name?: string;
  description?: string | null;
  remote?: string | null;
  autopublish?: boolean;
  manifest?: string | null;
}

export type RemotePolicy = "immediate" | "on_demand" | "streamed";

/** VERIFIED live: proxy_username/proxy_password/username/password are
 * write-only on Pulp's side - a GET response never echoes them back, only
 * whether one is currently set (see `FileRemote.hidden_fields`). */
export interface HiddenRemoteField {
  name: string;
  is_set: boolean;
}

export interface FileRemote {
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
 * optional, standard pulpcore Remote fields (not File-specific). Only
 * meaningful as *write* fields - see `FileRemote.hidden_fields` for why
 * `proxy_username`/`proxy_password`/`username`/`password` have no read-side
 * counterpart. */
export interface FileRemoteConnectionSettings {
  proxy_url?: string | null;
  proxy_username?: string | null;
  proxy_password?: string | null;
  username?: string | null;
  password?: string | null;
  tls_validation?: boolean;
  ca_cert?: string | null;
}

export interface FileRemoteCreate extends FileRemoteConnectionSettings {
  name: string;
  url: string;
  policy?: RemotePolicy;
}

/** PATCH body - every field optional (partial update). */
export interface FileRemoteUpdate extends FileRemoteConnectionSettings {
  name?: string;
  url?: string;
  policy?: RemotePolicy;
}

/** A second remote "flavor" - syncs files from a git repository instead of a
 * plain URL listing (VERIFIED live: no `policy` field at all, unlike a
 * standard remote - a git clone has no immediate/on_demand/streamed
 * distinction). `git_ref` defaults to "HEAD" server-side when unset. */
export interface FileGitRemote {
  pulp_href: string;
  name: string;
  url: string;
  git_ref: string;
  pulp_created: string;
  proxy_url: string | null;
  tls_validation: boolean;
  ca_cert: string | null;
  hidden_fields: HiddenRemoteField[];
}

export interface FileGitRemoteCreate extends FileRemoteConnectionSettings {
  name: string;
  url: string;
  git_ref?: string;
}

/** PATCH body - VERIFIED live: unlike RPM's ULN remote, the git flavor here
 * supports PATCH/PUT just like a standard remote, so it gets a real Edit
 * modal too. */
export interface FileGitRemoteUpdate extends FileRemoteConnectionSettings {
  name?: string;
  url?: string;
  git_ref?: string;
}

export interface FileDistribution {
  pulp_href: string;
  name: string;
  base_path: string;
  base_url: string;
  repository: string | null;
  publication: string | null;
  pulp_created: string;
}

export interface FileDistributionCreate {
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

/** A single file content unit - just a path and its digests (no
 * package-style metadata, unlike RPM's Package). */
export interface FileContent {
  pulp_href: string;
  relative_path: string;
  sha256: string | null;
}

// --- Schema drift checks (see schemaDriftCheck.ts) --------------------------
//
// One entry per hand-written type above, each checked against its matching
// generated schema component. A compile error on a `true` below - "Type
// 'true' is not assignable to type 'never'" - names (via the property key)
// exactly which hand-written type has a field the live schema no longer
// has; re-verify that one type, not the others.
type _FileSchemaDriftChecks = {
  FileRepository: AssertFieldsExist<
    components["schemas"]["file.FileRepositoryResponse"],
    FileRepository
  >;
  FileRepositoryCreate: AssertFieldsExist<
    components["schemas"]["file.FileRepository"],
    FileRepositoryCreate
  >;
  FileRepositoryUpdate: AssertFieldsExist<
    components["schemas"]["Patchedfile.FileRepository"],
    FileRepositoryUpdate
  >;
  FileRemote: AssertFieldsExist<
    components["schemas"]["file.FileRemoteResponse"],
    FileRemote
  >;
  FileRemoteCreate: AssertFieldsExist<
    components["schemas"]["file.FileRemote"],
    FileRemoteCreate
  >;
  FileRemoteUpdate: AssertFieldsExist<
    components["schemas"]["Patchedfile.FileRemote"],
    FileRemoteUpdate
  >;
  FileGitRemote: AssertFieldsExist<
    components["schemas"]["file.FileGitRemoteResponse"],
    FileGitRemote
  >;
  FileGitRemoteCreate: AssertFieldsExist<
    components["schemas"]["file.FileGitRemote"],
    FileGitRemoteCreate
  >;
  FileGitRemoteUpdate: AssertFieldsExist<
    components["schemas"]["Patchedfile.FileGitRemote"],
    FileGitRemoteUpdate
  >;
  FileDistribution: AssertFieldsExist<
    components["schemas"]["file.FileDistributionResponse"],
    FileDistribution
  >;
  FileDistributionCreate: AssertFieldsExist<
    components["schemas"]["file.FileDistribution"],
    FileDistributionCreate
  >;
  ContentSummary: AssertFieldsExist<
    components["schemas"]["ContentSummaryResponse"],
    ContentSummary
  >;
  RepositoryVersion: AssertFieldsExist<
    components["schemas"]["RepositoryVersionResponse"],
    RepositoryVersion
  >;
  FileContent: AssertFieldsExist<
    components["schemas"]["file.FileContentResponse"],
    FileContent
  >;
};
// Type-only checkpoint (not exported, not read anywhere else) - its only
// purpose is for the object literal below to fail to compile on drift.
const _fileSchemaDriftChecks: _FileSchemaDriftChecks = {
  FileRepository: true,
  FileRepositoryCreate: true,
  FileRepositoryUpdate: true,
  FileRemote: true,
  FileRemoteCreate: true,
  FileRemoteUpdate: true,
  FileGitRemote: true,
  FileGitRemoteCreate: true,
  FileGitRemoteUpdate: true,
  FileDistribution: true,
  FileDistributionCreate: true,
  ContentSummary: true,
  RepositoryVersion: true,
  FileContent: true,
};
void _fileSchemaDriftChecks;
