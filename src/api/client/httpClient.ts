export { jsonFetch as pulpFetch } from "./jsonFetch";

// Only the API base path is configurable; the shared transport enforces
// same-origin credentials and CSRF handling (ADR 0005).
const API_BASE_PATH = import.meta.env.VITE_PULP_API_BASE_PATH ?? "/pulp/api/v3";

export function apiPath(suffix: string): string {
  return `${API_BASE_PATH}${suffix}`;
}
