// Mirrors pulpit-core/app/modules/signing/schemas.py and app/core/jobs/schemas.py.
// None of these types has a private-key field - see that module's docstring
// for why there structurally can't be one to add by mistake.

export type SigningKeyState = "next" | "active" | "retiring" | "retired";

export interface SigningSettings {
  id: string;
  signing_enabled: boolean;
  package_signing_enabled: boolean;
  metadata_signing_enabled: boolean;
  key_name: string;
  identity_name: string;
  identity_email: string;
  algorithm: string;
  validity_days: number;
  public_key_filename: string;
  rpm_signing_service_name: string;
  metadata_signing_service_name: string;
  auto_rotation_enabled: boolean;
  rotation_generate_before_days: number;
  rotation_activate_before_days: number;
  key_retention_days: number;
  allow_indefinite_validity: boolean;
  updated_at: string;
}

export type SigningSettingsUpdate = Partial<Omit<SigningSettings, "id" | "updated_at">>;

export interface SigningKey {
  id: string;
  state: SigningKeyState;
  key_id: string;
  fingerprint: string;
  identity_name: string;
  identity_email: string;
  algorithm: string;
  generated_by: string;
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
  retiring_at: string | null;
  retired_at: string | null;
  public_key_url: string;
}

export type PulpServicePurpose = "package" | "metadata";
export type PulpServiceStatus = "pending_manual_setup" | "active" | "superseded";

export interface SigningKeyPulpService {
  purpose: PulpServicePurpose;
  status: PulpServiceStatus;
  name: string;
  pulp_href: string | null;
  /** Only present while status is "pending_manual_setup" - the exact
   * `pulpcore-manager add-signing-service ...` command an administrator
   * must run inside the `pulp` container - see docs/signing.md. */
  bootstrap_command: string | null;
  created_at: string;
}

export type JobStatus = "queued" | "running" | "success" | "failed";

export interface Job {
  id: string;
  job_type: string;
  status: JobStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  scheduled_at: string;
  started_at: string | null;
  finished_at: string | null;
  requested_by: string | null;
  created_at: string;
}

export interface RepositorySigningPolicy {
  package_signing_enabled: boolean;
  metadata_signing_enabled: boolean;
  package_signing_service: string | null;
  package_signing_fingerprint: string | null;
  metadata_signing_service: string | null;
}

// Mirrors pulpit-core/app/modules/tls/schemas.py. No field here has private
// key material - see that module's models.py docstring for why there
// structurally can't be one to add by mistake.
export type TlsCertSource = "self_signed" | "manual";

export interface TlsCertificate {
  id: string;
  source: TlsCertSource;
  subject: string;
  fingerprint_sha256: string;
  not_before: string;
  not_after: string;
  created_at: string;
}

export interface TlsActiveCertificate extends TlsCertificate {
  days_until_expiry: number;
  warn_days: number;
  is_expiring_soon: boolean;
}

export interface TlsCertificateHistoryEntry {
  id: string;
  event: string;
  source: TlsCertSource;
  fingerprint_sha256: string;
  not_after: string;
  triggered_by: string;
  notes: string;
  created_at: string;
}

export interface ManualCertificateUpload {
  cert_pem: string;
  key_pem: string;
}

// Mirrors pulpit-core/app/modules/content_size/schemas.py. A component with
// no entry (not a 0-byte entry) means no content of that type has ever been
// seen - see that module's models.py docstring.
export interface ComponentContentSize {
  component: string;
  size_bytes: number;
  updated_at: string;
}

// Same idea, one entry per repository (its latest version) - keyed by the
// repository's own pulp_href, which every RepositoriesPage already has.
export interface RepositoryContentSize {
  repository_href: string;
  size_bytes: number;
  updated_at: string;
}

// Same idea, one entry per plugin component instead of per repository -
// how many repositories of that component type currently exist.
export interface ComponentRepositoryCount {
  component: string;
  count: number;
  updated_at: string;
}

// Mirrors pulpit-core/app/modules/default_settings/schemas.py.
// proxy_password is deliberately absent here too - GET never echoes it
// back (VERIFIED, same write-only handling as Pulp's own Remote.
// proxy_password - see RemoteConnectionSettingsFields.tsx), only whether
// one is set.
export interface DefaultSettings {
  id: string;
  proxy_url: string;
  proxy_username: string;
  proxy_password_is_set: boolean;
  /** Mirrors Remote.tls_validation exactly (true means validate) - Pulp has
   * only one tls_validation flag per Remote, shared by the origin server
   * AND the proxy connection, never two separate ones. There is no
   * Pulp-side way to skip validation for only the proxy while still
   * validating the origin (or vice versa). */
  proxy_tls_validation: boolean;
  /** Public material (unlike proxy_password above) - returned in full, not
   * behind an `is_set` indirection. Applied to every new Remote's own
   * native `ca_cert` field (RemoteConnectionSettingsFields.tsx), the same
   * per-remote-override pattern as proxy_tls_validation. Replaces the old
   * trusted_ca module's docker-exec/update-ca-trust mechanism - Pulp's own
   * aiohttp downloader already trusts a Remote's `ca_cert` IN ADDITION TO
   * the system CA bundle (pulpcore's DownloaderFactory), so this needed no
   * container-filesystem automation at all. */
  proxy_ca_cert: string | null;
  updated_at: string;
}

export interface DefaultSettingsUpdate {
  proxy_url?: string;
  proxy_username?: string;
  /** Omit to leave unchanged, "" to clear the stored password, any other
   * value to replace it - see DefaultSettingsUpdate's docstring in
   * pulpit-core/app/modules/default_settings/schemas.py. */
  proxy_password?: string;
  proxy_tls_validation?: boolean;
  /** Same three-state convention as proxy_password above. */
  proxy_ca_cert?: string;
}

/** The real, decrypted default proxy - deliberately a separate type/request
 * from DefaultSettings above. Fetched only at the moment
 * RemoteConnectionSettingsFields.tsx actually needs to apply the default
 * proxy to a Remote, never by the Default Settings page itself. */
export interface DefaultProxyCredentials {
  proxy_url: string;
  proxy_username: string;
  proxy_password: string | null;
  proxy_ca_cert: string | null;
}

// Mirrors pulpit-core/app/modules/nav_visibility/schemas.py. UI-visibility
// convenience only - never an authorization boundary, see that module's
// models.py docstring. `module_id` values match src/app/layout/navTree.ts's
// own stable per-group `id`s (the single source of truth for "what modules
// exist" - pulpit-core doesn't duplicate that list server-side).
//
// Allow-list, not deny-list, and global (docs/adr/0009-nav-visibility-settings.md):
// an empty `visible_module_ids` means unrestricted - everyone sees
// everything, staff included, until an administrator explicitly grants a
// specific non-empty subset in Administration's General tab, which then
// restricts every user equally (no staff bypass).
export interface NavVisibilitySettings {
  visible_module_ids: string[];
}

/** The resolved answer for the calling user (GET .../nav_visibility/me).
 *
 * `visible_module_ids: null` means unrestricted - the same for every
 * caller, staff or not, no bypass - deliberately not "every known module
 * id", which pulpit-core has no list of at all (see NavVisibilitySettings'
 * own comment). A non-empty array is a real, different answer: restricted
 * to exactly those modules, for every caller. */
export interface ResolvedNavVisibility {
  visible_module_ids: string[] | null;
}

// Mirrors pulpit-core/app/modules/ldap/schemas.py. Staff-only end to end
// (app/modules/ldap/routes/*.py) - this configures how everyone on the
// instance authenticates, not a per-Remote connection detail.
export type LdapGroupType = "group_of_names" | "posix_group" | "nested_group_of_names";

export interface LdapSettings {
  id: string;
  enabled: boolean;
  server_uri: string;
  bind_dn: string;
  bind_password_is_set: boolean;
  start_tls: boolean;
  user_search_base: string;
  user_search_filter: string;
  group_search_base: string;
  group_search_filter: string;
  group_type: LdapGroupType;
  require_group_dn: string | null;
  mirror_groups: boolean;
  attr_first_name: string;
  attr_last_name: string;
  attr_email: string;
  updated_at: string;
}

export interface LdapSettingsUpdate {
  enabled?: boolean;
  server_uri?: string;
  bind_dn?: string;
  /** Omit to leave unchanged, "" to clear the stored password, any other
   * value to replace it - same three-state convention as
   * DefaultSettingsUpdate.proxy_password. */
  bind_password?: string;
  start_tls?: boolean;
  user_search_base?: string;
  user_search_filter?: string;
  group_search_base?: string;
  group_search_filter?: string;
  group_type?: LdapGroupType;
  /** Same three-state convention as bind_password above. */
  require_group_dn?: string;
  mirror_groups?: boolean;
  attr_first_name?: string;
  attr_last_name?: string;
  attr_email?: string;
}

/** Tests against whatever's currently in the form, not necessarily saved -
 * every field optional, falling back to the saved row server-side
 * (app/modules/ldap/service.py's resolve_test_settings). `bind_password`
 * omitted means "use the already-saved one". */
export interface LdapTestConnectionRequest {
  server_uri?: string;
  bind_dn?: string;
  bind_password?: string;
  start_tls?: boolean;
  user_search_base?: string;
  user_search_filter?: string;
  group_search_base?: string;
  group_search_filter?: string;
  require_group_dn?: string;
}

export interface LdapTestConnectionResult {
  success: boolean;
  error?: string;
  bound_as?: string;
  user_search_matched?: boolean;
  user_search_error?: string;
  group_search_matched?: boolean;
  group_search_error?: string;
  require_group_dn_exists?: boolean;
  require_group_dn_error?: string;
}

export interface LdapApplyResult {
  manifest_written: boolean;
  pulp_api_healthy: boolean;
  error?: string;
}

// Mirrors pulpit-core/app/modules/api_compatibility/schemas.py. Result of
// the one-shot startup check (pulpit-worker enqueues it exactly once per
// container launch, never on a recurring schedule) comparing this app's
// known Pulp API paths (scripts/api/extract-used-endpoints.mjs) against
// the connected instance's own live OpenAPI schema.
export interface ApiCompatibilityCheck {
  checked_at: string;
  pulp_reachable: boolean;
  missing_endpoints: string[];
  error: string | null;
}
