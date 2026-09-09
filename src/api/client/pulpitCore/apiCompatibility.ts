import { coreFetch, corePath } from "./httpClient";
import type { ApiCompatibilityCheck } from "./types";

const BASE = corePath("/api_compatibility");

/** 404s until pulpit-worker's own startup check has run at least once
 * (fresh deploy, or a worker that hasn't finished booting yet) - callers
 * treat that the same as "no issues detected" (useApiCompatibilityWarning),
 * never as an error to surface on its own. */
export function getLatestApiCompatibilityCheck(): Promise<ApiCompatibilityCheck> {
  return coreFetch<ApiCompatibilityCheck>(`${BASE}/latest`);
}
