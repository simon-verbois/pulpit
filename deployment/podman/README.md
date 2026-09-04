# Podman (`podman play kube`)

Plain Kubernetes-YAML Pod manifests `podman play kube` runs directly against the local
Podman engine - **not** Compose, and **not** a real Kubernetes cluster (that's
`deployment/kube/`, a genuinely different target with different capabilities - see "Why
this is a separate directory from `deployment/kube/`" below). See `docs/DEPLOYMENT.md`
"Podman" for the fuller picture. Run every command below from the repo root.

## Deploying

```sh
cp deployment/podman/00-secret.example.yaml deployment/podman/00-secret.yaml
# edit deployment/podman/00-secret.yaml - replace every REPLACE_ME value
# (openssl rand -hex 32 for both key/password fields)

systemctl --user start podman.socket   # rootless; see PULPIT_PODMAN_SOCKET below
./deployment/podman/deploy.sh up
```

Open `http://localhost:8080/`. Tear down with `./deployment/podman/deploy.sh down` (named
volumes/PVCs are kept - `podman volume rm` them yourself for a truly clean slate).

`PULPIT_PODMAN_SOCKET` (shell env var, not read from `.env`) overrides the socket path
`deploy.sh` substitutes into `docker-socket-proxy.yaml` - defaults to the current user's own
rootless socket (`/run/user/$(id -u)/podman/podman.sock`). A rootful Podman host needs
`PULPIT_PODMAN_SOCKET=/run/podman/podman.sock` instead.

## Why this is a separate directory from `deployment/kube/`

`podman play kube` only interprets a **subset** of Kubernetes YAML client-side against the
local Podman engine - VERIFIED live, not assumed:

- **Supported kinds**: Pods, Deployments, DaemonSets, Jobs, PersistentVolumeClaims,
  ConfigMaps, Secrets. **No Ingress, no RBAC (Role/RoleBinding/ServiceAccount), no real
  Service objects** - there is no Kubernetes API server here at all, just a one-shot
  translator into Podman's own container/pod primitives.
- **No Kubernetes API server means `KubernetesExecExecutor` cannot work here** - it calls
  the real `pods/exec` API subresource, which doesn't exist under `play kube`. This stack
  uses `DockerExecExecutor` instead (`docker-socket-proxy.yaml`), the exact same mechanism
  `compose.yml` uses - VERIFIED live end-to-end (a real `pulpcore-manager --version` exec
  through the deployed `docker-socket-proxy` pod, using `app/adapters/pulp/executor.py`
  completely unmodified).
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
  (`../docker/pulp/init-admin-password.sh`, bind-mounted via `hostPath`) with `podman exec`
  instead, once `pulp` is healthy - the same idea as `compose.yml`'s `post_start` hook, just
  orchestrated by a script rather than expressible in the YAML.
- **SELinux confinement blocks more than Docker's default does**, VERIFIED with
  `ausearch -m avc`, not guessed - both `docker-socket-proxy.yaml` (connecting to Podman's
  own API socket) and `pulp.yaml` (reading a plain `hostPath`-mounted file) need
  `securityContext.seLinuxOptions.type: spc_t` on an SELinux-enforcing host (Fedora/RHEL,
  Podman's own primary ecosystem) - a no-op elsewhere.
- **No variable interpolation in YAML at all** (unlike Compose's `${VAR}`) - `deploy.sh`
  substitutes the two placeholders that need a real path
  (`__PULPIT_PODMAN_SOCKET_PATH__`, `__PULPIT_REPO_ROOT__`) into temporary copies before
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
