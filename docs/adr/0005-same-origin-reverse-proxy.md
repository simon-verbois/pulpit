# ADR 0005: Same-origin nginx reverse proxy

## Status

Accepted

## Context

Pulpit calls Pulp's REST API, content app, and (for pulp_container) the OCI registry API from the
browser. Serving Pulpit and Pulp from different origins would require CORS configuration on Pulp
(extra Pulp-side config to keep in sync, and a strictly worse security posture than same-origin),
plus hardcoded absolute URLs in the frontend for every deployment.

## Decision

Pulpit and Pulp are served from one public origin, fronted by nginx:

```
https://<host>/
    /                    -> Pulpit static SPA (with SPA fallback to index.html)
    /pulp/api/...        -> Pulp REST API
    /pulp/content/...    -> Pulp content app
    /v2/...              -> Pulp container registry (pulp_container)
    /ui/...              -> 404 (legacy pulp-ui is not served; see below)
```

The frontend only ever calls **relative** URLs (e.g. `/pulp/api/v3/status/`). No hostname, port,
or protocol is hardcoded in application source, except clearly-labeled local development defaults
(`docs/DEVELOPMENT.md`). Runtime origin/host configuration is a deployment concern (nginx config,
`.env`), not something baked into the JS bundle.

`/ui/` (the bundled legacy `pulp-ui` shipped inside the Pulp all-in-one image) is intentionally
not proxied through in the Pulpit-fronted deployment; nginx returns a plain 404 for it. Pulpit
replaces its management use case. We do not modify the Pulp container image to remove pulp-ui —
we simply don't expose that path at the reverse-proxy layer.

In local development without the full Compose stack, Vite's dev server proxy (`vite.config.ts`)
plays the same same-origin role for `/pulp` and `/v2` against a Pulp instance reachable from the
dev machine — see `docs/DEVELOPMENT.md`.

## Alternatives considered

- **Cross-origin with CORS enabled on Pulp**: works, but adds Pulp-side configuration burden,
  weakens the origin boundary, and forces absolute URLs into the frontend. Rejected as the
  default.
- **Absolute, environment-variable-driven API base URL baked in at build time**: would work but
  reintroduces a `VITE_*`-configured absolute URL (public, and different per environment,
  requiring a distinct build per deployment target) where a same-origin relative path needs
  neither. Kept as a possible non-default escape hatch, not the primary path.

## Consequences

- Deployment topology is "one nginx in front of static Pulpit + Pulp," documented concretely in
  `docs/DEPLOYMENT.md` and implemented for local dev in `docker/nginx/pulpit.conf.template` +
  `compose.yml`.
- The `/v2/` registry path needs registry-appropriate proxy settings (larger body size limits,
  suitable timeouts/buffering for image layer transfer); these are configured with sensible
  defaults and explicitly flagged for validation against real `podman`/`docker push`/`pull`
  traffic once available (see `docs/DEPLOYMENT.md` known limitations).
- TLS termination in production happens at this same nginx layer (or a load balancer in front of
  it) — see `docs/SECURITY.md`.
