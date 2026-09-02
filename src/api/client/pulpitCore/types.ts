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
