// VERIFIED against the live OpenAPI schema of a pulpcore 3.116.1 instance
// with pulp_hugging_face installed (component=hugging_face - see
// docs/PULP_API.md and the pulp-api skill). Only the fields Pulpit's UI
// actually reads/writes are modeled here.
//
// Each response/write type below has a paired `AssertFieldsExist` check
// (bottom of file) against the generated schema in
// src/api/generated/hugging_face/ (ADR 0004) - a compile error there means
// this hand-written type has drifted from what Pulp's live schema actually
// has, not a runtime bug.

import type { components } from "../../generated/hugging_face/schema";
import type { AssertFieldsExist } from "../schemaDriftCheck";

/** Pulp's standard limit/offset pagination envelope. */
export interface PulpPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// VERIFIED live: unlike RPM/File, this plugin's Repository has no
// `autopublish` field at all - a Hugging Face repository must always be
// published manually (see usePublishHuggingFaceRepositoryMutation).
export interface HuggingFaceRepository {
  pulp_href: string;
  name: string;
  description: string | null;
  remote: string | null;
  versions_href: string;
  latest_version_href: string;
  pulp_created: string;
}

export interface HuggingFaceRepositoryCreate {
  name: string;
  description?: string | null;
  remote?: string | null;
}

/** PATCH body - every field optional (partial update). */
export interface HuggingFaceRepositoryUpdate {
  name?: string;
  description?: string | null;
  remote?: string | null;
}

export type RemotePolicy = "immediate" | "on_demand" | "streamed";

/** VERIFIED live: proxy_username/proxy_password/username/password are
 * write-only on Pulp's side - a GET response never echoes them back, only
 * whether one is currently set (see `HuggingFaceRemote.hidden_fields`). */
export interface HiddenRemoteField {
  name: string;
  is_set: boolean;
}

export interface HuggingFaceRemote {
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
 * meaningful as *write* fields - see `HuggingFaceRemote.hidden_fields` for
 * why `proxy_username`/`proxy_password`/`username`/`password` have no
 * read-side counterpart. */
export interface HuggingFaceRemoteConnectionSettings {
  proxy_url?: string | null;
  proxy_username?: string | null;
  proxy_password?: string | null;
  username?: string | null;
  password?: string | null;
  tls_validation?: boolean;
  ca_cert?: string | null;
}

export interface HuggingFaceRemoteCreate extends HuggingFaceRemoteConnectionSettings {
  name: string;
  url: string;
  policy?: RemotePolicy;
  /** For pointing at a self-hosted/private Hub instead of the public
   * huggingface.co (VERIFIED live: defaults server-side to
   * "https://huggingface.co" when unset). */
  hf_hub_url?: string;
  /** VERIFIED live: present on the read side too (not filtered into
   * `hidden_fields` like proxy/origin credentials are) - treated as
   * write-only in this app's own UI anyway (never pre-filled on Edit),
   * consistent with how every other secret-shaped field here behaves. */
  hf_token?: string | null;
}

/** PATCH body - every field optional (partial update). */
export interface HuggingFaceRemoteUpdate extends HuggingFaceRemoteConnectionSettings {
  name?: string;
  url?: string;
  policy?: RemotePolicy;
  hf_hub_url?: string;
  hf_token?: string | null;
}

export interface HuggingFaceDistribution {
  pulp_href: string;
  name: string;
  base_path: string;
  base_url: string;
  repository: string | null;
  publication: string | null;
  pulp_created: string;
}

export interface HuggingFaceDistributionCreate {
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

/** A model/dataset/space file synced (or uploaded) from the Hugging Face
 * Hub - VERIFIED live: `repo_id` (e.g. "bert-base-uncased") is required,
 * unlike every other simple plugin's content, since a file's identity here
 * is meaningless without knowing which Hub repo it came from. */
export interface HuggingFaceContent {
  pulp_href: string;
  relative_path: string;
  repo_id: string;
  repo_type: string | null;
}

// --- Schema drift checks (see schemaDriftCheck.ts) --------------------------
//
// One entry per hand-written type above, each checked against its matching
// generated schema component. A compile error on a `true` below - "Type
// 'true' is not assignable to type 'never'" - names (via the property key)
// exactly which hand-written type has a field the live schema no longer
// has; re-verify that one type, not the others.
type _HuggingFaceSchemaDriftChecks = {
  HuggingFaceRepository: AssertFieldsExist<
    components["schemas"]["hugging_face.HuggingFaceRepositoryResponse"],
    HuggingFaceRepository
  >;
  HuggingFaceRepositoryCreate: AssertFieldsExist<
    components["schemas"]["hugging_face.HuggingFaceRepository"],
    HuggingFaceRepositoryCreate
  >;
  HuggingFaceRepositoryUpdate: AssertFieldsExist<
    components["schemas"]["Patchedhugging_face.HuggingFaceRepository"],
    HuggingFaceRepositoryUpdate
  >;
  HuggingFaceRemote: AssertFieldsExist<
    components["schemas"]["hugging_face.HuggingFaceRemoteResponse"],
    HuggingFaceRemote
  >;
  HuggingFaceRemoteCreate: AssertFieldsExist<
    components["schemas"]["hugging_face.HuggingFaceRemote"],
    HuggingFaceRemoteCreate
  >;
  HuggingFaceRemoteUpdate: AssertFieldsExist<
    components["schemas"]["Patchedhugging_face.HuggingFaceRemote"],
    HuggingFaceRemoteUpdate
  >;
  HuggingFaceDistribution: AssertFieldsExist<
    components["schemas"]["hugging_face.HuggingFaceDistributionResponse"],
    HuggingFaceDistribution
  >;
  HuggingFaceDistributionCreate: AssertFieldsExist<
    components["schemas"]["hugging_face.HuggingFaceDistribution"],
    HuggingFaceDistributionCreate
  >;
  ContentSummary: AssertFieldsExist<
    components["schemas"]["ContentSummaryResponse"],
    ContentSummary
  >;
  RepositoryVersion: AssertFieldsExist<
    components["schemas"]["RepositoryVersionResponse"],
    RepositoryVersion
  >;
  HuggingFaceContent: AssertFieldsExist<
    components["schemas"]["hugging_face.HuggingFaceContentResponse"],
    HuggingFaceContent
  >;
};
// Type-only checkpoint (not exported, not read anywhere else) - its only
// purpose is for the object literal below to fail to compile on drift.
const _huggingFaceSchemaDriftChecks: _HuggingFaceSchemaDriftChecks = {
  HuggingFaceRepository: true,
  HuggingFaceRepositoryCreate: true,
  HuggingFaceRepositoryUpdate: true,
  HuggingFaceRemote: true,
  HuggingFaceRemoteCreate: true,
  HuggingFaceRemoteUpdate: true,
  HuggingFaceDistribution: true,
  HuggingFaceDistributionCreate: true,
  ContentSummary: true,
  RepositoryVersion: true,
  HuggingFaceContent: true,
};
void _huggingFaceSchemaDriftChecks;
