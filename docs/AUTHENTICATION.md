# Authentication

Pulp owns authentication. Pulpit consumes whatever mechanism the Pulp deployment in front of it
is configured with — it does not implement its own.

## VERIFIED (bootstrap environment)

- Pulpcore's REST API (as exposed by the `docker.io/pulp/pulp:stable` image used for local dev)
  supports HTTP Basic authentication and Django session authentication against its own user
  database. The live OpenAPI schema (`securitySchemes` in `/pulp/api/v3/docs/api.json`) declares
  exactly two: `basicAuth` (HTTP Basic) and `cookieAuth` (an `apiKey` cookie named `sessionid`).
- `GET/POST/PATCH/DELETE /pulp/api/v3/login/` is pulpcore's session endpoint - **not** a
  username/password form submission endpoint. Confirmed behavior:
  - `GET` - "who am I": `200` with `{pulp_href, prn, username}` if a session/Basic-auth request is
    authenticated, `401` otherwise. Pulpit's `useCurrentUserQuery` (`src/hooks/`) uses this to
    decide whether to render the app or redirect to `/login`.
  - `POST` - authenticates via the **`Authorization: Basic ...` header** (there is no request
    body); on success (`201`) it sets an `httpOnly` `sessionid` cookie plus a JS-readable
    `csrftoken` cookie, and returns the same `{pulp_href, prn, username}` body. On bad credentials:
    `401 {"detail": "Invalid username/password."}`.
  - `DELETE` - logs out (`204`), but **requires the `X-CSRFToken` header** once a session exists
    (Django's CSRF check on unsafe methods) - see `src/api/client/httpClient.ts`, which attaches it
    automatically by reading the (non-httpOnly) `csrftoken` cookie.
  - Django's CSRF check also validates the request's `Origin` header against
    `CSRF_TRUSTED_ORIGINS`, which pulpcore does not default to Pulpit's own origin - this had to be
    set explicitly in `compose.yml` (`PULP_CSRF_TRUSTED_ORIGINS`) or every mutating
    session-authenticated request (including logout) 403s. See `docs/DEPLOYMENT.md`.
  - **VERIFIED, and important:** every `401` from pulpcore's DRF `BasicAuthentication` includes a
    `WWW-Authenticate: Basic realm="api"` header. Browsers treat that as an invitation to show
    their own native credential prompt on top of the page - which happened on first load here
    (the "who am I" check 401s before login), stealing focus from Pulpit's own login form. Fixed
    by stripping that header at the nginx layer for `/pulp/api/` (`proxy_hide_header
WWW-Authenticate;` in `deployment/docker/nginx/pulpit.conf.template`), since Pulpit never relies on the
    browser's native prompt - it authenticates itself via one explicit `POST /login/` call. This is
    scoped to `/pulp/api/` only, not `/v2/` (the container registry), where real `podman`/`docker`
    clients do need to see the (Bearer, not Basic) challenge header to negotiate token auth.
- Pulpit's login flow (`src/features/auth/LoginPage.tsx`): the user's password is used for exactly
  one `POST /login/` call (as a Basic-auth header, built in-memory, never persisted anywhere) to
  obtain a session; every request after that relies solely on the browser's own `sessionid`
  cookie, which Pulpit's JS never reads or writes directly.

## LDAP

Administration → LDAP (`src/features/administration/ldap/`) configures Pulp's own
`django-auth-ldap` backend directly: server/bind credentials, user and group search bases/filters,
and attribute/group-type mapping, plus a "Test connection" action that binds against the directory
before anything is applied. Settings are applied via the same colocated-reconciler mechanism used
for repository signing (`pulpit-core/app/modules/ldap/`) — Pulpit still never authenticates users
itself; it only writes the Django settings Pulp's own LDAP backend reads. LDAP group mirroring
populates Django's standard `Group` model, so mirrored groups appear in Pulpit's existing Groups UI
with no extra work.

## ASSUMPTION / not yet validated in this environment

- SSO/OIDC and reverse-proxy authentication (the proxy authenticates the user and forwards trusted
  headers or a validated session to Pulp) are integration points **Pulp itself** can be configured
  to support, and reverse-proxy auth specifically is architecturally compatible with ADR 0005's
  same-origin nginx layer — but neither is configured or exercised in the bootstrap dev
  environment. Do not claim Pulpit "supports SSO" — beyond LDAP (above), it supports _whatever Pulp
  is configured to accept_, transparently, because it never hardcodes an auth mechanism.

## What Pulpit does

- Sends the browser's credentials/session to Pulp using whatever mechanism the live schema and
  `/pulp/api/v3/status/`/auth responses indicate is active, over the same origin (ADR 0005) so no
  cross-origin credential handling is needed.
- Treats a `401` as "not authenticated" and a `403` as "authenticated but not permitted" —
  distinct UI states (see `docs/PULP_API.md`), never conflated.
- Never stores a password. Never persists Basic-auth credentials in `localStorage` or
  `sessionStorage`. If session-cookie auth is in use, the browser (not Pulpit's JS) owns that
  cookie per normal same-origin cookie handling.
- Never creates a Pulpit-specific account, session table, or credential store of any kind.

## Forbidden practices (see also `docs/SECURITY.md`)

- Storing credentials of any kind in `localStorage`/`sessionStorage`/`IndexedDB`.
- A Pulpit-only login database, JWT implementation, or session store.
- Assuming a specific external auth provider (LDAP/OIDC/etc.) is configured — always derive
  behavior from what the live Pulp instance actually reports/accepts.

## What to do when implementing/changing the login flow

1. Fetch the live OpenAPI schema and inspect `securitySchemes` and any auth-related endpoints.
2. Send an unauthenticated request to a protected endpoint and observe the actual response
   (status code, `WWW-Authenticate` header if any).
3. Implement against what was actually observed; update this document's VERIFIED section with
   what you found, and move anything you can now confirm out of ASSUMPTION.
