import { coreFetch, corePath } from "./httpClient";
import type {
  Job,
  RepositorySigningPolicy,
  SigningKey,
  SigningKeyPulpService,
  SigningKeyState,
  SigningSettings,
  SigningSettingsUpdate,
} from "./types";

const BASE = corePath("/signing");

export function getSigningSettings(): Promise<SigningSettings> {
  return coreFetch<SigningSettings>(`${BASE}/settings`);
}

export function updateSigningSettings(
  changes: SigningSettingsUpdate,
): Promise<SigningSettings> {
  return coreFetch<SigningSettings>(`${BASE}/settings`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function listSigningKeys(state?: SigningKeyState): Promise<SigningKey[]> {
  const query = state ? `?state=${encodeURIComponent(state)}` : "";
  return coreFetch<SigningKey[]>(`${BASE}/keys${query}`);
}

export function getSigningKey(id: string): Promise<SigningKey> {
  return coreFetch<SigningKey>(`${BASE}/keys/${id}`);
}

export function getSigningKeyPulpServices(id: string): Promise<SigningKeyPulpService[]> {
  return coreFetch<SigningKeyPulpService[]>(`${BASE}/keys/${id}/pulp-services`);
}

export function generateSigningKey(options: {
  validity_days?: number | null;
  no_expiration?: boolean;
}): Promise<Job> {
  return coreFetch<Job>(`${BASE}/keys/generate`, {
    method: "POST",
    body: JSON.stringify(options),
  });
}

/** Publishes a NEXT key as THE single active signing key immediately -
 * schedules mandatory resigning/republishing of every affected
 * repository's existing content (docs/signing.md), never just a state flip. */
export function publishSigningKey(id: string, reason = "manual"): Promise<Job> {
  return coreFetch<Job>(`${BASE}/keys/${id}/publish`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function extendSigningKeyExpiration(
  id: string,
  additionalDays: number,
): Promise<Job> {
  return coreFetch<Job>(`${BASE}/keys/${id}/extend-expiration`, {
    method: "POST",
    body: JSON.stringify({ additional_days: additionalDays }),
  });
}

export function getRepositorySigningPolicy(): Promise<RepositorySigningPolicy> {
  return coreFetch<RepositorySigningPolicy>(`${BASE}/repositories/policy`);
}

export function configureRepositorySigning(options: {
  repository_href: string;
  sign_packages?: boolean;
  sign_metadata?: boolean;
}): Promise<Job> {
  return coreFetch<Job>(`${BASE}/repositories/configure`, {
    method: "POST",
    body: JSON.stringify(options),
  });
}

/** Brings every EXISTING RPM repository into line with the current global
 * signing policy (repositories created after this policy already apply it
 * automatically at creation, no per-repository opt-in - see
 * RepositorySigningFieldGroup.tsx's removal). Schedules real re-signing of
 * already-synced package content where needed, not just a future-uploads-only
 * field change. */
export function applySigningToAllRepositories(): Promise<Job> {
  return coreFetch<Job>(`${BASE}/repositories/apply-to-all`, { method: "POST" });
}

/** The per-repository "Re-sign" action: re-applies the current signing
 * policy to one RPM repository (with the caller's own Pulp credentials),
 * then queues a full pass that re-signs every package in it not yet signed
 * with the active key (or just republishes, for a metadata-only policy).
 * Returns an already in-flight resign job for this repository if there is
 * one, rather than queueing a duplicate. */
export function resignRepository(repositoryHref: string): Promise<Job> {
  return coreFetch<Job>(`${BASE}/repositories/resign`, {
    method: "POST",
    body: JSON.stringify({ repository_href: repositoryHref }),
  });
}
