import { coreFetch, corePath } from "./httpClient";
import type {
  Job,
  ManualCertificateUpload,
  TlsActiveCertificate,
  TlsCertificate,
  TlsCertificateHistoryEntry,
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
