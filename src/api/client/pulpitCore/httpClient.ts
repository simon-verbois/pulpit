import { getCsrfToken } from "../../auth/csrf";
import { fromNetworkFailure, toPulpApiError } from "../../errors/PulpApiError";

// Same-origin, relative-only requests (ADR 0005/0006) - pulpit-core is
// reached through the same nginx origin as Pulp, never a separate
// hostname/port. See docker/nginx/pulpit.conf.template ("/pulpit-core/api/").
const API_BASE_PATH = "/pulpit-core/api/v1";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Build a path under pulpit-core's API base, e.g. corePath("/signing/settings"). */
export function corePath(suffix: string): string {
  return `${API_BASE_PATH}${suffix}`;
}

/**
 * Fetch a pulpit-core API path and parse it as JSON. Reuses the same
 * normalized error shape as Pulp requests (PulpApiError) - despite the
 * name, `toPulpApiError` only classifies by HTTP status and stashes the raw
 * body for the "technical details" expansion, so it applies just as well to
 * pulpit-core's FastAPI error responses and lets every existing
 * ErrorState/error-handling call site work unchanged for both backends.
 *
 * pulpit-core has no Django CSRF middleware of its own, but its auth
 * dependency (pulpit-core/app/core/auth.py) enforces the same
 * cookie-vs-header double-submit check Django does, using the SAME
 * `csrftoken` cookie Pulp's login already set - so this reuses
 * `getCsrfToken()` rather than inventing a second token.
 */
export async function coreFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const csrfToken = SAFE_METHODS.has(method) ? undefined : getCsrfToken();

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        ...init?.headers,
      },
    });
  } catch (cause) {
    throw fromNetworkFailure(cause);
  }

  if (!response.ok) {
    throw await toPulpApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
