# Podman (Quadlet / `systemd --user`)

Plain Kubernetes-YAML Pod manifests, applied through one generated **Podman Quadlet** unit
(a `systemd --user` service backed by `podman kube play`) - **not** Compose, and **not** a real
Kubernetes cluster (that's `deployment/kube/`, a genuinely different target with different
capabilities - see "Why this is a separate directory from `deployment/kube/`" below). See
`docs/DEPLOYMENT.md` "Podman" for the fuller picture. Run every command below from the repo root.

Requires a Podman new enough to ship the Quadlet generator (`/usr/libexec/podman/quadlet`,
Podman >= 4.4).

## Deploying

```sh
# Not on http://localhost:8080? Edit deployment/podman/00-configmap.yaml first -
# see "Overriding config" below. deploy.sh never edits this file for you.

systemctl --user start podman.socket   # rootless
./deployment/podman/deploy.sh init
./deployment/podman/deploy.sh up
```

`init` generates `deployment/podman/00-secret.yaml` when it does not exist
(`PULP_SECRET_KEY`/`PULPIT_CORE_SECRET_KEY` via `openssl rand`, plus a random
`PULP_ADMIN_PASSWORD`) and prints the admin password once. It never deploys anything or
overwrites an existing file. `up` performs the same initialization automatically when needed, so
running `init` separately is optional. Prefer to set your own values instead? Run this before
`deploy.sh init` or `deploy.sh up` and the file will be left alone:

```sh
cp deployment/podman/00-secret.example.yaml deployment/podman/00-secret.yaml
# edit deployment/podman/00-secret.yaml - replace every REPLACE_ME value
# (openssl rand -hex 32 for both key/password fields)
```

`up` (re)generates one Quadlet unit file, `~/.config/containers/systemd/pulpit-stack.kube`
(Redis + Pulp + Pulpit together - see "Why one unit, not one per component" below), reloads
systemd, and restarts it (`systemctl --user restart`, so a manifest/config edit is always picked up
on a re-run, not just on first deploy). This is a `systemd --user` unit: to keep running after you
log out entirely (e.g. right after a host reboot with no active session), enable lingering once -
`up`'s own output reminds you:

```sh
loginctl enable-linger "$(whoami)"
```

Open the URL you set as `PULPIT_PUBLIC_ORIGIN` in `00-configmap.yaml` (`http://localhost:8080/` if
you left it at its checked-in default). `./deployment/podman/deploy.sh down` stops the unit while
keeping named volumes, the unit itself, and every YAML file. `./deployment/podman/deploy.sh reset`
stops and removes the Quadlet unit and permanently deletes the stack's pods/containers, volumes,
and unused manifest images, but still keeps every YAML file, including `00-secret.yaml`. Because
reset destroys all Pulp and Pulpit data, it requires typing `reset`; for automation, set
`PULPIT_RESET_CONFIRM=yes`.

`./deployment/podman/deploy.sh update` pulls and applies any newer image found in the stack
(`podman auto-update`, relying on `pulpit-stack.kube`'s `AutoUpdate=registry`) and restarts
`pulpit-stack.service` if one was found - Redis, Pulp, and Pulpit are all covered together, see
"Why one unit, not one per component" below for why that's deliberate.

Running `deploy.sh` without a command prints its built-in command reference. The available
commands are `init`, `up`, `update`, `down`, and `reset`.

Day-to-day systemd operations once deployed (same unit name `deploy.sh` itself uses):

```sh
systemctl --user status pulpit-stack.service
journalctl --user -u pulpit-stack.service -f
systemctl --user restart pulpit-stack.service
```

## Why one unit, not one per component

`simonverbois/pulpit` and `simonverbois/pulp-pulpit` are built and published together, from the
same commit, in the same CI run, on every release (`.forgejo/workflows/release.yml`, and
`docs/adr/0008-colocated-signing-reconciler.md` - `pulp-pulpit`'s rebuild cadence is deliberately
tied to this project's own releases, not upstream Pulp's). Splitting the stack into separately
auto-updated Quadlet units would let one image advance to a newer release while the other stayed on
an older cached digest - exactly the drift `AutoUpdate=registry` is meant to prevent, not cause. One
unit means `deploy.sh update` (`podman auto-update`) always keeps every image in the stack - Redis
included - at the same point together. Redis auto-updating alongside the other two is an accepted
side effect of that same simplicity, not a goal in itself.

## Overriding config

`redis.yaml`/`pulp.yaml`/`pulpit.yaml` pin images to `:latest` - edit those files directly to
deploy a specific tag instead; `up` restarts the whole unit regardless of what changed, so this
is picked up the same way as any other config edit.

`deploy.sh` does **not** template or substitute anything into `00-configmap.yaml` (`podman play
kube` itself has no `${VAR}` interpolation, and unlike an earlier version of this script, nothing
here does either) - edit it directly. `PULPIT_PUBLIC_ORIGIN` (and the CSRF/content/Ansible/PyPI
origin fields that must carry the same value) ships checked in at `http://localhost:8080`; change
every one of those lines together before deploying somewhere else (a different `hostPort` in
`pulpit.yaml`, a different hostname, a reverse proxy in front, etc.) - get this wrong and logins
will work but every subsequent action (including logout) 403s, see `docs/DEPLOYMENT.md`
"CSRF_TRUSTED_ORIGINS".

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
  applied separately from the Pod(s) that reference them. The generated Quadlet unit's `[Kube]`
  section always lists `00-secret.yaml`/`00-configmap.yaml` alongside `redis.yaml`/`pulp.yaml`/
  `pulpit.yaml` for this reason (a `.kube` unit's `Yaml=` entries become one `podman kube play
  <file>...` invocation) - applying them once upfront (the natural thing to do on a real
  Kubernetes cluster) does not work here.
- **No `postStart` lifecycle hook** - VERIFIED live: the command never actually ran, and Quadlet's
  `.kube` unit type has no equivalent either. Also, a separate `Job` pod can't do this instead: it
  would need to reach `pulp`'s own _internal_ Postgres (`/var/lib/pgsql`, bundled inside that one
  container, never network-exposed) to run `pulpcore-manager reset-admin-password` itself.
  `pulpit-stack.kube`'s `ExecStartPost=` instead runs `set-admin-password.sh`, which `podman exec`s
  the same script content (a verbatim copy of `../docker/pulp/init-admin-password.sh`, baked into
  the `pulp-init-admin-password-script` ConfigMap in `pulp.yaml`) once the `pulp-pulp` container
  exists - the same idea as `compose.yml`'s `post_start` hook, just orchestrated by
  `ExecStartPost=` rather than expressible in the YAML. This blocks `systemctl start
  pulpit-stack.service` (and therefore `deploy.sh up`) until it finishes, same as the old
  bash-driven version did.
- **SELinux confinement blocks more than Docker's default does**, VERIFIED with
  `ausearch -m avc`, not guessed - a plain `hostPath`-mounted file stays labeled with
  whatever SELinux context the host filesystem gave it, which a confined `container_t`
  process can't read at all on an SELinux-enforcing host (Fedora/RHEL, Podman's own primary
  ecosystem). `pulp.yaml` no longer bind-mounts `init-admin-password.sh` from the host for
  exactly this reason - it's a ConfigMap-backed volume instead (see that file's own
  comments), which has no host-file label to fight and so needs no SELinux workaround at
  all. Worth knowing about if you add your own `hostPath` mount to these manifests later.
- **No variable interpolation in YAML at all** (unlike Compose's `${VAR}`) - `00-configmap.yaml`
  is applied as-is, edited by hand (see "Overriding config" above), not templated by `deploy.sh`.

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
- **`systemd --user` units need lingering to survive logout/reboot without an active session** -
  `deploy.sh` does not run `loginctl enable-linger` for you (it's a host-wide login setting, not
  something to change silently); see "Deploying" above.
- **`deploy.sh update` restarts the whole stack, including Redis** - see "Why one unit, not one
  per component" above for why that's intentional rather than an oversight.
- The Quadlet unit file under `~/.config/containers/systemd/` is fully regenerated by every
  `deploy.sh up` - editing it by hand does not persist past the next `up`; edit
  `redis.yaml`/`pulp.yaml`/`pulpit.yaml`/`00-configmap.yaml` or `deploy.sh` itself instead.
