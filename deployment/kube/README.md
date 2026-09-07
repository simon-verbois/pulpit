# Kubernetes manifests

Plain manifests (no Helm) mirroring `compose.yml`'s reference topology 1:1,
using the same published Docker Hub images (`simonverbois/pulpit`, the only
one needed - see `docs/adr/0007-merged-pulpit-container.md`) - see
`docs/DEPLOYMENT.md` "Kubernetes" for the full picture, including which
pieces are VERIFIED live versus correct-by-Kubernetes'-own-documented-
convention but not tested against a real cluster from this repo.

Run every command below from the repo root.

## Prerequisites

- A cluster with a storageClass that supports `ReadWriteMany` for
  `pulp.yaml`'s `pulpit-signing-gnupghome`/`pulpit-signing-scripts`
  PVCs (NFS, CephFS/rook-ceph, EFS on EKS, Filestore on GKE, Azure Files on
  AKS, ...) - several default local-path provisioners (e.g. kind's, k3s's)
  are `ReadWriteOnce` only and will leave `pulpit`'s pod stuck `Pending`. If
  you don't need repository signing at all, you can remove those two PVCs
  and their volumeMounts from `pulp.yaml`/`pulpit.yaml` instead of
  provisioning RWX storage just for this.
- An Ingress controller already installed, only if you want `pulpit.yaml`'s
  Ingress - otherwise skip that one document (or leave it applied; a
  missing controller just means it never gets an address) and use
  `kubectl port-forward svc/pulpit 8080:8080` instead.

## Deploying

```sh
./deployment/kube/deploy.sh up -n <your-namespace>
```

Use `deployment/kube/deploy.sh`, not a raw `kubectl apply -f deployment/kube/`
one-liner - that directory glob would also pick up
`00-secret.example.yaml` (literal `REPLACE_ME` placeholder values) if it
were ever present, creating a real Secret from it. `deploy.sh` applies
every manifest by an explicit filename list instead, and the first time
`deployment/kube/00-secret.yaml` doesn't exist yet, `up` generates it
automatically (`PULP_SECRET_KEY`/`PULPIT_CORE_SECRET_KEY` via `openssl
rand`, a random `PULP_ADMIN_PASSWORD`), printing the admin password once so
you can log in - no manual secret-editing step needed for a first deploy.
Prefer to set your own values instead? Run this before `deploy.sh up` and
it'll be left alone:

```sh
cp deployment/kube/00-secret.example.yaml deployment/kube/00-secret.yaml
# edit deployment/kube/00-secret.yaml - replace every REPLACE_ME value (openssl rand -hex 32
# for the two key fields - see that file's own comments)
```

`deploy.sh` also substitutes a few placeholders the plain YAML can't
express by itself (image tags, the public origin used for
`CSRF_TRUSTED_ORIGINS`) from environment variables before applying -
matching Compose's `.env.example` naming/defaults for consistency across
all three deployment targets:

| Env var                 | Default                 | Used in                                           |
| ----------------------- | ----------------------- | ------------------------------------------------- |
| `PULP_PULPIT_IMAGE_TAG` | `latest`                | `pulp.yaml`'s image tag                           |
| `PULPIT_IMAGE_TAG`      | `latest`                | `pulpit.yaml`'s image tag                         |
| `PULPIT_PUBLIC_ORIGIN`  | `http://localhost:8080` | `00-configmap.yaml`'s `PULP_CSRF_TRUSTED_ORIGINS` |

```sh
PULPIT_PUBLIC_ORIGIN=https://pulpit.example.com \
PULP_PULPIT_IMAGE_TAG=1.2.3 \
PULPIT_IMAGE_TAG=1.2.3 \
  ./deployment/kube/deploy.sh up -n <your-namespace>
```

Tear down with `./deployment/kube/deploy.sh down -n <your-namespace>`
(deletes the PVCs declared inline in `pulp.yaml`/`pulpit.yaml` too - back
up data first if you need to keep it; there's no equivalent of Podman's
named-volume persistence here).

Numeric prefixes (`00-configmap.yaml`, `00-secret.yaml`) only exist so they
sort before the files that reference them when eyeballing the directory -
`deploy.sh` applies files in a fixed, explicit order regardless of name,
so the prefixes are cosmetic, not load-bearing.

## What's intentionally different from compose.yml

- **One Deployment, not three** - `pulpit.yaml` runs nginx + pulpit-core +
  pulpit-worker in one Pod/container, same merged image as
  `compose.yml` (`docs/adr/0007-merged-pulpit-container.md`). Pulp
  (`pulp.yaml`) remains its own separate Deployment either way.
- **No separate database Deployment** - pulpit-core's own database is
  embedded SQLite (the `pulpit-data` PVC in `pulpit.yaml`), not a Postgres
  Deployment - `app/core/config/settings.py`.
- **No `docker-socket-proxy`, no RBAC at all** - `pulp.yaml` runs a derived
  image (`docker.io/simonverbois/pulp-pulpit`, same one `compose.yml`/
  `deployment/podman/` use) that reconciles signing-service registration
  from _inside_ the pod itself
  (docs/adr/0008-colocated-signing-reconciler.md) - `pulpit` never needs to
  reach the Kubernetes API, so no ServiceAccount/Role/RoleBinding exists in
  this directory at all.
- **No Compose `post_start` hook** - `pulp.yaml` uses Kubernetes' own
  `lifecycle.postStart` container hook instead, running the exact same
  script (inlined into a ConfigMap - see that file's own comment on why).
- **Health checks** use `httpGet` readiness+liveness probes instead of
  Compose `healthcheck:` blocks - same checks, Kubernetes' own idiom.
  `pulpit.yaml`'s `wait-for-pulp` `initContainer` reproduces Compose's
  `depends_on: pulp: condition: service_healthy` the same way
  `deployment/podman/pulpit.yaml` does.
- **No hardcoded namespace anywhere** - none of these manifests set
  `metadata.namespace` on any object, so every object simply takes on
  whatever namespace it's applied into (`kubectl apply -n <anything>` /
  `deploy.sh up -n <anything>`) without editing any file.

## Known gaps

- Single replica everywhere (`pulp` and `pulpit`'s embedded SQLite are both
  genuinely single-instance in this bootstrap - same scope as Compose).
- No NetworkPolicies, PodDisruptionBudgets, or HorizontalPodAutoscalers -
  add what your cluster's own conventions expect.
- `pulpit.yaml`'s Ingress is a minimal example (no TLS) - adapt it to your
  ingress controller and certificate setup.
