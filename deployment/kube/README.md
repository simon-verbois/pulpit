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
cp deployment/kube/00-secret.example.yaml deployment/kube/00-secret.yaml
# edit deployment/kube/00-secret.yaml - replace every REPLACE_ME value (openssl rand -hex 32
# for the two key fields - see that file's own comments)

kubectl apply -n <your-namespace> -f deployment/kube/
```

Numeric prefixes (`00-configmap.yaml`, `00-secret.yaml`) only exist so they
sort before the files that reference them when eyeballing the directory -
`kubectl apply -f deployment/kube/` applies every file in one pass regardless of name,
so ordering here is cosmetic, not load-bearing.

## What's intentionally different from compose.yml

- **One Deployment, not three** - `pulpit.yaml` runs nginx + pulpit-core +
  pulpit-worker in one Pod/container, same merged image as
  `compose.yml` (`docs/adr/0007-merged-pulpit-container.md`). Pulp
  (`pulp.yaml`) remains its own separate Deployment either way.
- **No separate database Deployment** - pulpit-core's own database is
  embedded SQLite (the `pulpit-data` PVC in `pulpit.yaml`), not a Postgres
  Deployment - `app/core/config/settings.py`.
- **No `docker-socket-proxy`** - `pulpit`'s worker loop talks to the
  Kubernetes API directly instead (`KubernetesExecExecutor`,
  `app/adapters/pulp/executor.py`), authenticated via the `pulpit`
  ServiceAccount/Role/RoleBinding this directory creates, narrower than the
  Docker/Podman socket-proxy approach (scoped to `get`/`list` on `pods` and
  `get`/`create` on `pods/exec`, this namespace only).
- **No Compose `post_start` hook** - `pulp.yaml` uses Kubernetes' own
  `lifecycle.postStart` container hook instead, running the exact same
  script (inlined into a ConfigMap - see that file's own comment on why).
- **Health checks** use `httpGet` readiness+liveness probes instead of
  Compose `healthcheck:` blocks - same checks, Kubernetes' own idiom.
- **No hardcoded namespace anywhere** - `pulpit.yaml` reads its own
  namespace from the Kubernetes Downward API
  (`fieldRef: metadata.namespace`), so `kubectl apply -n <anything>` just
  works without editing any file.

## Known gaps

- Single replica everywhere (`pulp` and `pulpit`'s embedded SQLite are both
  genuinely single-instance in this bootstrap - same scope as Compose).
- No NetworkPolicies, PodDisruptionBudgets, resource requests/limits, or
  HorizontalPodAutoscalers - add what your cluster's own conventions expect.
- `pulpit.yaml`'s Ingress is a minimal example (no TLS) - adapt it to your
  ingress controller and certificate setup.
