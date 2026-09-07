import { apiPath, pulpFetch } from "./httpClient";

// VERIFIED against a live pulpcore 3.116.0 instance (bootstrap dev
// environment, docs/PULP_API.md) - field names below are the real response
// shape, not a guess. Every field is still optional and the UI only ever
// renders what's actually present, since other pulpcore versions may differ.
export interface PulpComponentVersion {
  component: string;
  version: string;
  package?: string;
}

export interface PulpStatus {
  versions?: PulpComponentVersion[];
  online_workers?: unknown[];
  online_api_apps?: unknown[];
  online_content_apps?: unknown[];
  database_connection?: { connected?: boolean };
  redis_connection?: { connected?: boolean } | null;
  storage?: { total?: number; used?: number; free?: number } | null;
  domain_enabled?: boolean;
  // VERIFIED live - what a Distribution's own base_url is actually built
  // from server-side (Django's CONTENT_ORIGIN setting, PULP_CONTENT_ORIGIN
  // env var), which can differ from window.location.origin whenever that
  // setting isn't configured to match wherever this app is really reached
  // from (see src/hooks/useContentOrigin.ts).
  content_settings?: { content_origin?: string; content_path_prefix?: string };
}

export function getStatus(): Promise<PulpStatus> {
  return pulpFetch<PulpStatus>(apiPath("/status/"));
}
