import { getCsrfToken } from "../auth/csrf";
import { fromNetworkFailure, toPulpApiError } from "../errors/PulpApiError";

// Same-origin, relative-only requests (ADR 0005) - no hostnames/ports are
// ever hardcoded here. The base path itself is the one documented,
// build-time-configurable exception (see .env.example).
const API_BASE_PATH = import.meta.env.VITE_PULP_API_BASE_PATH ?? "/pulp/api/v3";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Build a path under the Pulp API base, e.g. apiPath("/status/"). */
export function apiPath(suffix: string): string {
  return `${API_BASE_PATH}${suffix}`;
}

/**
 * Fetch a Pulp API path (or a full href already rooted at "/pulp/...",
 * e.g. a task href returned by a previous response) and parse it as JSON.
 * Throws a normalized PulpApiError on any non-2xx response or network failure.
 */
export async function pulpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  // VERIFIED (docs/AUTHENTICATION.md): Pulp's session auth enforces Django's
  // CSRF check on unsafe methods once a session exists. Basic-auth-only
  // requests (e.g. the very first login) aren't checked, and there's no
  // csrftoken cookie to read yet at that point anyway, so this is a no-op
  // until a session has been established.
  const csrfToken = SAFE_METHODS.has(method) ? undefined : getCsrfToken();

  // FormData bodies (file uploads) must NOT get an explicit Content-Type:
  // fetch/the browser sets one itself, including the multipart boundary
  // parameter Django needs to parse the body - setting it manually breaks
  // the upload silently.
  const isFormData = init?.body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
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
