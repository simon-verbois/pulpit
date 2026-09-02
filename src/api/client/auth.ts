import { apiPath, pulpFetch } from "./httpClient";

// VERIFIED against a live pulpcore 3.116.0 instance (docs/AUTHENTICATION.md):
// GET/POST/DELETE /pulp/api/v3/login/ is a "current session" resource, not a
// username+password form endpoint:
//   GET    -> who am I (200 if a session/Basic-auth request is authenticated, 401 otherwise)
//   POST   -> exchange Basic-auth credentials (sent as the Authorization
//             header, not a request body) for a session: sets an httpOnly
//             "sessionid" cookie plus a JS-readable "csrftoken" cookie
//   DELETE -> log out (clears the session); requires the X-CSRFToken header
//             (added automatically by httpFetch for unsafe methods, see
//             httpClient.ts) once a session/csrftoken cookie exists
export interface PulpCurrentUser {
  pulp_href: string;
  prn: string;
  username: string;
}

export function getCurrentUser(): Promise<PulpCurrentUser> {
  return pulpFetch<PulpCurrentUser>(apiPath("/login/"));
}

function encodeBasicAuth(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

/**
 * Exchanges username/password for a Pulp session. The credentials are used
 * for this one request only (an Authorization header) and are never stored
 * anywhere - not in localStorage, not in memory beyond this call (see
 * AGENTS.md #6, docs/SECURITY.md).
 */
export function login(username: string, password: string): Promise<PulpCurrentUser> {
  return pulpFetch<PulpCurrentUser>(apiPath("/login/"), {
    method: "POST",
    headers: { Authorization: `Basic ${encodeBasicAuth(username, password)}` },
  });
}

export function logout(): Promise<void> {
  return pulpFetch<void>(apiPath("/login/"), { method: "DELETE" });
}
