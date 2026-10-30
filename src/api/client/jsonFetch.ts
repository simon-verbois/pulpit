import { getCsrfToken } from "../auth/csrf";
import { fromNetworkFailure, PulpApiError, toPulpApiError } from "../errors/PulpApiError";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Shared transport for Pulp and pulpit-core: credentials stay on this origin. */
export async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let target: URL;
  try {
    if (
      path.includes("\\") ||
      Array.from(path).some(
        (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
      ) ||
      path.startsWith("//")
    )
      throw new Error();
    target = new URL(path, window.location.origin);
    if (target.origin !== window.location.origin || target.username || target.password)
      throw new Error();
  } catch {
    throw new PulpApiError(
      "validation",
      "API requests must stay on the application origin.",
    );
  }

  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  // The browser supplies the multipart boundary for uploads.
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const csrfToken = SAFE_METHODS.has(method) ? undefined : getCsrfToken();
  if (csrfToken) headers.set("X-CSRFToken", csrfToken);

  let response: Response;
  try {
    response = await fetch(`${target.pathname}${target.search}`, {
      ...init,
      credentials: "same-origin",
      // API clients use canonical endpoints. A redirect must not forward
      // a CSRF token or authorization header to a different origin.
      redirect: "error",
      headers,
    });
  } catch (cause) {
    throw fromNetworkFailure(cause);
  }
  if (!response.ok) throw await toPulpApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
