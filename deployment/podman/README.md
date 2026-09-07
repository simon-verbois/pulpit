# Podman (`podman play kube`)

Plain Kubernetes-YAML Pod manifests `podman play kube` runs directly against the local
Podman engine - **not** Compose, and **not** a real Kubernetes cluster (that's
`deployment/kube/`, a genuinely different target with different capabilities - see "Why
this is a separate directory from `deployment/kube/`" below). See `docs/DEPLOYMENT.md`
"Podman" for the fuller picture. Run every command below from the repo root.

## Deploying

```sh
systemctl --user start podman.socket   # rootless
./deployment/podman/deploy.sh up
```

The first time `deployment/podman/00-secret.yaml` doesn't exist yet, `up` generates it
automatically (`PULP_SECRET_KEY`/`PULPIT_CORE_SECRET_KEY` via `openssl rand`, a random
`PULP_ADMIN_PASSWORD`), printing the admin password once so you can log in - no manual
secret-editing step needed for a first deploy. Prefer to set your own values instead? Run this
before `deploy.sh up` and it'll be left alone:

```sh
cp deployment/podman/00-secret.example.yaml deployment/podman/00-secret.yaml
# edit deployment/podman/00-secret.yaml - replace every REPLACE_ME value
# (openssl rand -hex 32 for both key/password fields)
```

Open `http://localhost:8080/`. Tear down with `./deployment/podman/deploy.sh down` (named
volumes/PVCs are kept - `podman volume rm` them yourself for a truly clean slate).

## Pinning versions and overriding config

`pulp.yaml`/`pulpit.yaml` pin images to `:latest` - edit those files directly to deploy a
specific tag instead.

`deploy.sh` substitutes the `__PULPIT_PUBLIC_ORIGIN__` placeholder in `00-configmap.yaml` from
an environment variable at apply time (`podman play kube` itself has no `${VAR}` interpolation):

```sh
# Deploying somewhere other than http://localhost:8080 (a different hostPort in
# pulpit.yaml, a different hostname, a reverse proxy in front, etc.) - get this wrong and
# logins will work but every subsequent action (including logout) 403s:
PULPIT_PUBLIC_ORIGIN=http://pulpit.example.internal:8080 ./deployment/podman/deploy.sh up
```

Applying the YAML files directly without `deploy.sh` (not recommended, but possible) means this
substitution doesn't happen - edit the `__PULPIT_PUBLIC_ORIGIN__` placeholder in
`00-configmap.yaml` directly instead.

## Why this is a separate directory from `deployment/kube/`

`podman play kube` only interprets a **subset** of Kubernetes YAML client-side against the
local Podman engine - VERIFIED live, not assumed:

- **Supported kinds**: Pods, Deployments, DaemonSets, Jobs, PersistentVolumeClaims,
  ConfigMaps, Secrets. **No Ingress, no RBAC (Role/RoleBinding/ServiceAccount), no real
  Service objects** - there is no Kubernetes API server here at all, just a one-shot
  translator into Podman's own container/pod primitives. This is no longer a limitation
  signing automation needs to work around (docs/adr/0008-colocated-signing-reconciler.md):
  the reconciler runs colocated inside `pulp.yaml`'s own image, the same one `compose.yml`
  and `deployment/kube/` use, needing no Docker/Podman socket or Kubernetes API access at all.
- **ConfigMaps/Secrets are not standalone objects** - VERIFIED live: `podman play kube` errors
  with "ConfigMaps in podman are not a standalone object and must be used in a container" if
  applied separately from the Pod(s) that reference them. `deploy.sh` always applies
  `00-configmap.yaml`/`00-secret.yaml` in the _same_ `podman play kube` invocation as
  `pulp.yaml`/`pulpit.yaml` for this reason - applying them once upfront (the natural thing
  to do on a real Kubernetes cluster) does not work here.
- **No `postStart` lifecycle hook** - VERIFIED live: the command never actually ran. Also, a
  separate `Job` pod can't do this instead: it would need to reach `pulp`'s own _internal_
  Postgres (`/var/lib/pgsql`, bundled inside that one container, never network-exposed) to
  run `pulpcore-manager reset-admin-password` itself. `deploy.sh` runs the same script
  content (a verbatim copy of `../docker/pulp/init-admin-password.sh`, baked into the
  `pulp-init-admin-password-script` ConfigMap in `pulp.yaml`) with `podman exec` instead,
  once `pulp` is healthy - the same idea as `compose.yml`'s `post_start` hook, just
  orchestrated by a script rather than expressible in the YAML.
- **SELinux confinement blocks more than Docker's default does**, VERIFIED with
  `ausearch -m avc`, not guessed - a plain `hostPath`-mounted file stays labeled with
  whatever SELinux context the host filesystem gave it, which a confined `container_t`
  process can't read at all on an SELinux-enforcing host (Fedora/RHEL, Podman's own primary
  ecosystem). `pulp.yaml` no longer bind-mounts `init-admin-password.sh` from the host for
  exactly this reason - it's a ConfigMap-backed volume instead (see that file's own
  comments), which has no host-file label to fight and so needs no SELinux workaround at
  all. Worth knowing about if you add your own `hostPath` mount to these manifests later.
- **No variable interpolation in YAML at all** (unlike Compose's `${VAR}`) - `deploy.sh`
  substitutes a handful of `__PLACEHOLDER__` tokens (image tags, public origin - see
  "Pinning versions and overriding config" above) into temporary copies of the YAML before
  applying.

None of this is a real Kubernetes cluster's RBAC/Ingress/Service model, so
`deployment/kube/`'s manifests are not reusable here as-is - hence a genuinely separate,
smaller directory tailored to what `play kube` actually supports, rather than a subset of
`deployment/kube/` with parts silently not working.

## Known gaps

- No RWX-storage discussion needed (unlike `deployment/kube/`) - every PVC here is just a local Podman
  named volume, already usable by as many pods on this one host as reference it.
- Single Podman host only - `play kube` has no multi-node/scheduling concept at all.
- `deploy.sh`'s health-wait loops poll every 5s for up to 5 minutes per component; adjust
  the script directly if your hardware needs longer.
