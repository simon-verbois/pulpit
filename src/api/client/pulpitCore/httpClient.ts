export { jsonFetch as coreFetch } from "../jsonFetch";

// The shared transport uses Pulp's csrftoken cookie, also checked by
// pulpit-core/app/core/auth.py. No separate auth or CSRF scheme (ADR 0006).
const API_BASE_PATH = "/pulpit-core/api/v1";

export function corePath(suffix: string): string {
  return `${API_BASE_PATH}${suffix}`;
}
