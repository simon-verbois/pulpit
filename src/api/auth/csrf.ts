// Django's CSRF cookie is deliberately NOT httpOnly (VERIFIED: a live Pulp
// login response sets it as a plain, JS-readable cookie) so the frontend can
// read it back and echo it as the X-CSRFToken header on unsafe requests -
// see docs/AUTHENTICATION.md. This is the only thing Pulpit ever reads out
// of a cookie; the session cookie itself stays httpOnly and is never
// touched by JS.
const CSRF_COOKIE_NAME = "csrftoken";

export function getCsrfToken(): string | undefined {
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CSRF_COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE_NAME.length + 1)) : undefined;
}
