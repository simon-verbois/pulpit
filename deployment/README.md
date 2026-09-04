# Deployment

One subdirectory per deployment technology, each with its own README covering exactly how to
deploy Pulpit that way:

- [`docker/`](docker/README.md) - Docker Compose, the primary, most-tested reference topology
  (`Dockerfile`, `compose.yml`, `compose-dev.yml`, and the nginx/entrypoint/init-script assets
  the image bakes in).
- [`podman/`](podman/README.md) - plain `podman play kube` manifests, **not** a Compose
  wrapper (explicit project choice) and **not** a real Kubernetes cluster.
- [`kube/`](kube/README.md) - plain Kubernetes manifests (no Helm) for a real cluster.

All three run the exact same published `simonverbois/pulpit` image and were VERIFIED live, not
just written to look plausible - see `docs/DEPLOYMENT.md` for the deeper technical picture
(architecture rationale, persistence, secrets, and what's genuinely different about each
target, e.g. why `podman/` can't use `KubernetesExecExecutor` or a `postStart` hook the way
`kube/` does).
