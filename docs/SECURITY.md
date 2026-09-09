# Security

## Threat boundary

The `pulpit` frontend is a static SPA with no backend of its own (ADR 0001). Its security-relevant
surface is: (1) the JS bundle running in the user's browser, (2) the same-origin nginx layer in
front of Pulp/pulpit-core, (3) whatever auth mechanism Pulp/the deployment enforces. There is no
Pulpit-frontend-side data store, session store, or business logic to compromise — reducing, not
eliminating, the attack surface.

**pulpit-core/pulpit-worker (ADR 0006, merged into the `pulpit` container by ADR 0007)** add a
second, narrower surface: an API process with its own embedded database, and a privileged worker
loop holding GPG signing key material - two separate OS processes/Unix identities sharing that one
container, not two separate containers, but the isolation between them is unchanged. Full detail —
trust model, subprocess safety, key exposure boundaries, backup/recovery — lives in
`docs/signing.md` "Security model," not duplicated here; the summary: neither nginx nor
pulpit-core's own API process (both running as the unprivileged `pulpit` user) ever has private
key material or the GNUPGHOME volume; only the worker loop (uid/gid 700) does, and it is never
reachable from the browser at all (no route to it exists in `deployment/docker/nginx/pulpit.conf.template`,
and it isn't an HTTP server to begin with). That worker loop never reaches into the `pulp`
container at all (ADR 0008): the one Pulp-side administrative command signing needs is instead
automated by a small reconciler colocated _inside_ a derived Pulp image
(`docker.io/simonverbois/pulp-pulpit`), reading a manifest off the volume already shared between
the two - no cross-container privilege of any kind; see ADR 0008 and `docs/signing.md`
"Automating the manual Pulp step" for the full rationale and scope.

## No frontend secrets

- No API keys, tokens, or credentials are ever committed (`.env.example` only, real values via
  untracked `.env`/deployment secrets).
- Any `VITE_*` build variable is compiled into the public JS bundle. Never put a secret in one —
  this is stated in `.env.example` and here deliberately, because it's an easy
  mistake with irreversible consequences (a leaked value can't be un-shipped from a bundle
  someone already downloaded).

## Authentication / credential handling

- No password or Basic-auth credential is ever persisted in `localStorage`, `sessionStorage`, or
  `IndexedDB` (`src/features/auth/LoginPage.tsx` holds the password in component state only for
  the single `POST /login/` call, then it's gone). See `docs/AUTHENTICATION.md`. This is distinct
  from `localStorage["pulpit:theme"]` (`src/app/theme/ThemeContext.tsx`), a non-sensitive UI
  preference, not a credential — see `docs/UX.md` "Theming".
- Session cookies are handled by the browser under normal same-origin cookie rules; Pulpit's JS
  never reads or writes the `sessionid` cookie (it's `httpOnly`). It does read the separate,
  intentionally non-`httpOnly` `csrftoken` cookie (`src/api/auth/csrf.ts`) to echo it back as the
  `X-CSRFToken` header on unsafe requests, per Django's CSRF design.
- Pulp's CSRF protection also checks the request's `Origin` header against `CSRF_TRUSTED_ORIGINS`,
  which must be configured to Pulpit's actual public origin (`compose.yml`,
  `docs/DEPLOYMENT.md`) — misconfigured, this fails closed (mutations 403) rather than open.

## XSS prevention

- React's default JSX escaping is relied on; `dangerouslySetInnerHTML` is avoided. If Pulp-sourced
  text (e.g. a collection README rendered as markdown/HTML) must ever be rendered as HTML, it must
  go through a vetted sanitizer, not raw injection — flagged as a `TODO` in `docs/ROADMAP.md` for
  when that feature (pulp_ansible collection docs) is actually built, not solved speculatively now.

## Dependency hygiene

- Dependencies are added only when justified, kept current, and installed via a
  committed `package-lock.json` for reproducible builds. `npm audit` (or equivalent) should be run
  periodically; this is a manual/CI step, not automated in the bootstrap.

## Reverse proxy / same origin

- Pulpit and Pulp share one origin (ADR 0005) specifically to avoid CORS and the credential
  handling complexity cross-origin setups invite.
- The container-registry path (`/v2/`) needs registry-appropriate body size/timeout settings
  (`deployment/docker/nginx/pulpit.conf.template`); these are dev-reasonable defaults, explicitly flagged for
  validation against real `podman`/`docker` push/pull traffic (see `docs/DEPLOYMENT.md`).

## TLS

- nginx serves both plain HTTP (`PULPIT_HTTP_PORT`, default 8080) and HTTPS (`PULPIT_HTTPS_PORT`,
  default 8443) - 8080 keeps working unchanged, 8443 is purely additive. A self-signed certificate
  is generated automatically on first boot if nothing else is configured, so 8443 always works out
  of the box, in development and production alike - see `docs/DEPLOYMENT.md` "TLS" for the
  Administration > TLS tab (manual certificate import, with an expiry warning on the Overview page).
- A load balancer/ingress in front of nginx terminating TLS itself instead (and forwarding plain
  HTTP to 8080) remains a fully supported, common alternative topology - nothing here requires
  nginx itself to be the TLS termination point.
- Do not enable HSTS or other TLS-only security headers unless TLS is actually terminated
  somewhere in the request path (this nginx layer's 8443, or a load balancer/ingress in front of
  it) - they have no effect and can actively break access when the only reachable path is plain
  HTTP (e.g. 8080 alone, port-forwarded straight to a pod).

## Content / uploads

- RPM package upload and container/Ansible content operations go directly through Pulp's own
  content-handling APIs; Pulpit does not inspect, transform, or store uploaded content itself —
  it streams the request to Pulp and reflects Pulp's validation result.

## Security headers (production)

Production nginx config should set standard hardening headers (`X-Content-Type-Options: nosniff`,
a reasonable `Content-Security-Policy`, `Referrer-Policy`, and HSTS **only when TLS is actually
terminated there**). These belong in the production nginx config documented in
`docs/DEPLOYMENT.md`, kept clearly separate from the dev config in `deployment/docker/nginx/`.

## Development vs. production differences

| Concern           | Development (Compose)                 | Production                                                                    |
| ----------------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| Transport         | HTTP (8080), self-signed HTTPS (8443) | HTTPS at an ingress/reverse proxy, or a manually imported certificate on 8443 |
| Secrets           | `.env` (local, untracked)             | Real secret manager / orchestrator secret                                     |
| `PULP_SECRET_KEY` | Generated locally, dev-only           | Managed secret, never reused from dev                                         |
| Security headers  | Minimal                               | Full hardening set, HSTS enabled                                              |

## Signing and derived-size authorization

Signing settings and key lifecycle mutations require Pulp staff status. A single
repository configuration PATCH runs with the interactive caller's Pulp credentials;
Pulp enforces object permissions. Only its task href enters the job queue, never
cookies or Basic credentials. The worker follows that task to its terminal state.
Privileged Pulp clients reject other origins; distribution downloads use the known
`/pulp/content/` path on the configured internal Pulp server.

LDAP connection tests require a trusted certificate for LDAPS and STARTTLS, including
hostname validation. Install the LDAP CA in the container's system trust store for
private CAs; an untrusted certificate is an error, not a successful connection test.
Both connect and receive operations have finite timeouts.

The former `content_size` routes and worker scan are removed. Size calculations run
in the browser against Pulp with the caller's permissions and live only in TanStack
Query. Historical size tables remain unused for migration compatibility.

CI runs `npm audit` and `pip-audit` against the full installed dependency list
from `pip freeze --exclude-editable` (the local application is not a PyPI package).
Python security floors include FastAPI, Starlette and cryptography. pip-audit is a
development-only dependency.
