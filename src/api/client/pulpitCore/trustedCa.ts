import { coreFetch, corePath } from "./httpClient";
import type { Job, TrustedCaCertificate, TrustedCaCertificateCreate } from "./types";

const BASE = corePath("/trusted_ca/certificates");

export function listTrustedCaCertificates(): Promise<TrustedCaCertificate[]> {
  return coreFetch<TrustedCaCertificate[]>(BASE);
}

/** Returns the queued sync Job (task section 12: never applied inline) -
 * callers track it with useJob and refetch the certificate list once it
 * settles, same pattern as signing key generation. */
export function createTrustedCaCertificate(
  data: TrustedCaCertificateCreate,
): Promise<Job> {
  return coreFetch<Job>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteTrustedCaCertificate(id: string): Promise<void> {
  return coreFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}
