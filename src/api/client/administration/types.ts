// VERIFIED against the live OpenAPI schema of a pulpcore 3.116.0 instance
// (fetched from /pulp/api/v3/docs/api.json - see docs/PULP_API.md
// "Administration endpoints"). Pulpcore-core, not plugin-specific.
//
// Each response/write type below has a paired `AssertFieldsExist` check
// (bottom of file) against the generated schema in src/api/generated/
// (ADR 0004) - a compile error there means this hand-written type has
// drifted from what Pulp's live schema actually has, not a runtime bug.
// Cert content guards (pulp_certguard) are their own installable component,
// distinct from "core" - see scripts/api/fetch-schema.mjs.

import type { components } from "../../generated/core/schema";
import type { components as CertGuardComponents } from "../../generated/certguard/schema";
import type { AssertFieldsExist } from "../schemaDriftCheck";

export interface PulpPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Read-only (VERIFIED live schema: `signing-services/` supports GET only,
 * no POST/PUT/PATCH/DELETE at all) - creating one requires a server-side
 * script + a Django management command, out of scope for this UI. */
export interface SigningService {
  pulp_href: string;
  name: string;
  public_key: string;
  pubkey_fingerprint: string;
  script: string;
}

/** The generic `contentguards/` list only ever returns these common fields
 * (VERIFIED live) - the type-specific extra fields (header_name,
 * ca_certificate, guards...) only come back from that specific flavor's own
 * endpoint. `prn` encodes the flavor (e.g. "prn:core.headercontentguard:...")
 * - see contentGuardKindFromPrn() in contentGuards.ts. */
export interface ContentGuardSummary {
  pulp_href: string;
  prn: string;
  name: string;
  description: string | null;
}

export type ContentGuardKind =
  "header" | "rbac" | "content_redirect" | "composite" | "x509" | "rhsm";

export interface HeaderContentGuard extends ContentGuardSummary {
  header_name: string;
  header_value: string;
  jq_filter: string | null;
}

export interface HeaderContentGuardWrite {
  name: string;
  description?: string | null;
  header_name: string;
  header_value: string;
  jq_filter?: string | null;
}

/** `users`/`groups` are read-only here (VERIFIED live) - managed via the
 * same generic per-object add_role/remove_role/list_roles actions every
 * RBAC-protected object exposes (see objectRoles.ts and ObjectAccessTab.tsx),
 * not a bespoke endpoint. VERIFIED live: creating one auto-grants the
 * creator a "downloader" role on it, the same auto-owner pattern seen on
 * repositories (docs/PULP_API.md "Access endpoints"). */
export interface RBACContentGuard extends ContentGuardSummary {
  users: { username: string; pulp_href: string }[];
  groups: { name: string; pulp_href: string }[];
}

export interface RBACContentGuardWrite {
  name: string;
  description?: string | null;
}

/** No extra fields beyond ContentGuardSummary (VERIFIED live) - kept as its
 * own type alias for clarity at call sites, matching HeaderContentGuard/
 * RBACContentGuard's shape. */
export type ContentRedirectContentGuard = ContentGuardSummary;

export interface ContentRedirectContentGuardWrite {
  name: string;
  description?: string | null;
}

export interface CompositeContentGuard extends ContentGuardSummary {
  guards: string[];
}

export interface CompositeContentGuardWrite {
  name: string;
  description?: string | null;
  guards: string[];
}

export interface CertContentGuard extends ContentGuardSummary {
  ca_certificate: string;
}

export interface CertContentGuardWrite {
  name: string;
  description?: string | null;
  ca_certificate: string;
}

// --- Schema drift checks (see schemaDriftCheck.ts) --------------------------
// X509CertGuard and RHSMCertGuard share an identical shape (VERIFIED
// live) - CertContentGuard/CertContentGuardWrite are checked against
// X509's schema only as the representative of both.
type _AdministrationSchemaDriftChecks = {
  SigningService: AssertFieldsExist<
    components["schemas"]["SigningServiceResponse"],
    SigningService
  >;
  ContentGuardSummary: AssertFieldsExist<
    components["schemas"]["ContentGuardResponse"],
    ContentGuardSummary
  >;
  HeaderContentGuard: AssertFieldsExist<
    components["schemas"]["HeaderContentGuardResponse"],
    HeaderContentGuard
  >;
  HeaderContentGuardWrite: AssertFieldsExist<
    components["schemas"]["HeaderContentGuard"],
    HeaderContentGuardWrite
  >;
  RBACContentGuard: AssertFieldsExist<
    components["schemas"]["RBACContentGuardResponse"],
    RBACContentGuard
  >;
  RBACContentGuardWrite: AssertFieldsExist<
    components["schemas"]["RBACContentGuard"],
    RBACContentGuardWrite
  >;
  ContentRedirectContentGuard: AssertFieldsExist<
    components["schemas"]["ContentRedirectContentGuardResponse"],
    ContentRedirectContentGuard
  >;
  ContentRedirectContentGuardWrite: AssertFieldsExist<
    components["schemas"]["ContentRedirectContentGuard"],
    ContentRedirectContentGuardWrite
  >;
  CompositeContentGuard: AssertFieldsExist<
    components["schemas"]["CompositeContentGuardResponse"],
    CompositeContentGuard
  >;
  CompositeContentGuardWrite: AssertFieldsExist<
    components["schemas"]["CompositeContentGuard"],
    CompositeContentGuardWrite
  >;
  CertContentGuard: AssertFieldsExist<
    CertGuardComponents["schemas"]["certguard.X509CertGuardResponse"],
    CertContentGuard
  >;
  CertContentGuardWrite: AssertFieldsExist<
    CertGuardComponents["schemas"]["certguard.X509CertGuard"],
    CertContentGuardWrite
  >;
};
const _administrationSchemaDriftChecks: _AdministrationSchemaDriftChecks = {
  SigningService: true,
  ContentGuardSummary: true,
  HeaderContentGuard: true,
  HeaderContentGuardWrite: true,
  RBACContentGuard: true,
  RBACContentGuardWrite: true,
  ContentRedirectContentGuard: true,
  ContentRedirectContentGuardWrite: true,
  CompositeContentGuard: true,
  CompositeContentGuardWrite: true,
  CertContentGuard: true,
  CertContentGuardWrite: true,
};
void _administrationSchemaDriftChecks;
