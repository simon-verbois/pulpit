import { coreFetch, corePath } from "./httpClient";
import type {
  FreeIpaWizardSetupRequest,
  FreeIpaWizardSetupResult,
  Job,
  ManualCertificateUpload,
  TlsActiveCertificate,
  TlsCertificate,
  TlsCertificateHistoryEntry,
  TlsFreeIpaSettings,
  TlsFreeIpaSettingsUpdate,
} from "./types";

const BASE = corePath("/tls");

export function getActiveTlsCertificate(): Promise<TlsActiveCertificate> {
  return coreFetch<TlsActiveCertificate>(`${BASE}/active`);
}

export function listTlsCertificateHistory(): Promise<TlsCertificateHistoryEntry[]> {
  return coreFetch<TlsCertificateHistoryEntry[]>(`${BASE}/history`);
}

/** Replaces whatever certificate is currently active with a fresh
 * self-signed one (task section 12: never generated inline - returns a
 * queued Job, callers track it with useJob). */
export function regenerateSelfSignedTlsCertificate(): Promise<Job> {
  return coreFetch<Job>(`${BASE}/selfsigned/regenerate`, { method: "POST" });
}

/** Validated and installed synchronously (no job/polling) - the private
 * key must never transit through a persisted job payload, and there's no
 * external network call here to justify making the caller poll. */
export function uploadManualTlsCertificate(
  upload: ManualCertificateUpload,
): Promise<TlsCertificate> {
  return coreFetch<TlsCertificate>(`${BASE}/manual`, {
    method: "POST",
    body: JSON.stringify(upload),
  });
}

export function getFreeIpaSettings(): Promise<TlsFreeIpaSettings> {
  return coreFetch<TlsFreeIpaSettings>(`${BASE}/freeipa/settings`);
}

export function updateFreeIpaSettings(
  changes: TlsFreeIpaSettingsUpdate,
): Promise<TlsFreeIpaSettings> {
  return coreFetch<TlsFreeIpaSettings>(`${BASE}/freeipa/settings`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function testFreeIpaConnection(): Promise<Job> {
  return coreFetch<Job>(`${BASE}/freeipa/test-connection`, { method: "POST" });
}

export function requestFreeIpaCertificate(): Promise<Job> {
  return coreFetch<Job>(`${BASE}/freeipa/request-cert`, { method: "POST" });
}

/** Runs synchronously (no polling) - see docs/tls.md "Guided setup
 * (wizard)": `request.admin_password` is sent once, used by pulpit-core for
 * the duration of this one call, and never persisted anywhere. */
export function runFreeIpaWizardSetup(
  request: FreeIpaWizardSetupRequest,
): Promise<FreeIpaWizardSetupResult> {
  return coreFetch<FreeIpaWizardSetupResult>(`${BASE}/freeipa/wizard/setup`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}
