import type { JobStatus } from "../../api/client/pulpitCore/types";

/** pulpit-core job types (each module's `job_registry.register(...)`) as
 * the action a person would recognize. Unknown types fall back to the raw
 * name rather than a guess. */
const JOB_LABELS: Record<string, string> = {
  "signing.generate_key": "Generate signing key",
  "signing.publish_key": "Publish signing key",
  "signing.retire_key": "Retire signing key",
  "signing.extend_expiration": "Extend signing key expiration",
  "signing.check_pulp_bootstrap": "Check signing services",
  "signing.rotation_check": "Signing key rotation check",
  "signing.configure_repository_signing": "Configure repository signing",
  "signing.resign_repository_packages": "Re-sign repository packages",
  "signing.publish_repository_metadata": "Republish signed metadata",
  "signing.apply_signing_to_all_repositories": "Sign all repositories",
  "signing.detect_repository_content_changes": "Detect synced content to sign",
  "ldap.apply_config": "Apply LDAP configuration",
  "ldap.test_connection": "Test LDAP connection",
  "tls.generate_selfsigned": "Generate self-signed certificate",
  "tls.renewal_check": "TLS certificate renewal check",
  "content_size.refresh": "Refresh content sizes",
  "content_size.refresh_repository_counts": "Refresh repository counts",
  "default_settings.apply_proxy_to_all_remotes": "Apply proxy to all remotes",
  "api_compatibility.check": "Pulp API compatibility check",
  "fixture_seed.seed_sample_fixtures": "Seed sample fixtures",
};

export function jobLabel(jobType: string): string {
  return JOB_LABELS[jobType] ?? jobType;
}

export const JOB_STATUS_COLOR: Record<JobStatus, "grey" | "blue" | "green" | "red"> = {
  queued: "grey",
  running: "blue",
  success: "green",
  failed: "red",
};

export const TERMINAL_JOB_STATUSES: ReadonlySet<JobStatus> = new Set([
  "success",
  "failed",
]);
