import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { ContentGuardKind, ContentGuardSummary, PulpPage } from "./types";

const GENERIC_BASE = apiPath("/contentguards/");
const HEADER_BASE = apiPath("/contentguards/core/header/");
const RBAC_BASE = apiPath("/contentguards/core/rbac/");
const CONTENT_REDIRECT_BASE = apiPath("/contentguards/core/content_redirect/");
const COMPOSITE_BASE = apiPath("/contentguards/core/composite/");
const X509_BASE = apiPath("/contentguards/certguard/x509/");
const RHSM_BASE = apiPath("/contentguards/certguard/rhsm/");

/** Maps a content guard's `prn` (e.g. "prn:core.headercontentguard:...") to
 * the flavor-specific endpoint base and a human-readable label - VERIFIED
 * live against every flavor's real prn. The generic `contentguards/` list
 * only returns common fields (name/description), never which flavor a row
 * is beyond this. */
const KIND_INFO: Record<string, { kind: ContentGuardKind; label: string; base: string }> =
  {
    "core.headercontentguard": { kind: "header", label: "Header", base: HEADER_BASE },
    "core.rbaccontentguard": { kind: "rbac", label: "RBAC", base: RBAC_BASE },
    "core.contentredirectcontentguard": {
      kind: "content_redirect",
      label: "Content redirect",
      base: CONTENT_REDIRECT_BASE,
    },
    "core.compositecontentguard": {
      kind: "composite",
      label: "Composite",
      base: COMPOSITE_BASE,
    },
    "certguard.x509certguard": {
      kind: "x509",
      label: "X.509 certificate",
      base: X509_BASE,
    },
    "certguard.rhsmcertguard": {
      kind: "rhsm",
      label: "RHSM certificate",
      base: RHSM_BASE,
    },
  };

export function contentGuardKindFromPrn(
  prn: string,
): { kind: ContentGuardKind; label: string } | null {
  const contentType = prn.replace(/^prn:/, "").replace(/:.*$/, "");
  const info = KIND_INFO[contentType];
  return info ? { kind: info.kind, label: info.label } : null;
}

function baseForKind(kind: ContentGuardKind): string {
  const entry = Object.values(KIND_INFO).find((info) => info.kind === kind);
  if (!entry) {
    throw new Error(`Unknown content guard kind: ${kind}`);
  }
  return entry.base;
}

export interface ListContentGuardsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listContentGuards(
  params: ListContentGuardsParams,
): Promise<PulpPage<ContentGuardSummary>> {
  return pulpFetch<PulpPage<ContentGuardSummary>>(`${GENERIC_BASE}${buildQuery(params)}`);
}

export async function getContentGuardByName(
  name: string,
): Promise<ContentGuardSummary | null> {
  const page = await pulpFetch<PulpPage<ContentGuardSummary>>(
    `${GENERIC_BASE}${buildQuery({ name, limit: 1, offset: 0 })}`,
  );
  return page.results[0] ?? null;
}

/** Works regardless of flavor (VERIFIED live: DELETE on a content guard's
 * own href, which already encodes its specific type in the path). */
export function deleteContentGuard(href: string): Promise<void> {
  return pulpFetch<void>(href, { method: "DELETE" });
}

/** Fetches the flavor-specific detail (header_name, ca_certificate,
 * guards...) that the generic list doesn't carry - the href itself already
 * points at the right flavor's endpoint, so this is just a typed GET. */
export function getContentGuardDetail<T>(href: string): Promise<T> {
  return pulpFetch<T>(href);
}

/** Fetches every guard page - used to populate the Composite guard's
 * "which guards to combine" picker. */
export async function listAllContentGuards(): Promise<ContentGuardSummary[]> {
  const page = await listContentGuards({ limit: 100, offset: 0 });
  return page.results;
}

/** Generic create/update dispatch by kind - used by CreateContentGuardModal/
 * EditContentGuardModal so they don't need a switch over every flavor's own
 * shape themselves. `data` is intentionally loosely typed here (each
 * flavor's modal builds the exact shape its own kind expects) - there are no
 * flavor-specific typed create/update functions to fall back to; every
 * current and past call site has gone through this dispatcher. */
export function createContentGuardByKind(
  kind: ContentGuardKind,
  data: Record<string, unknown>,
) {
  return pulpFetch(baseForKind(kind), { method: "POST", body: JSON.stringify(data) });
}
export function updateContentGuardByKind(href: string, data: Record<string, unknown>) {
  return pulpFetch(href, { method: "PATCH", body: JSON.stringify(data) });
}
