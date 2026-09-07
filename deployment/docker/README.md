# Docker Compose

The primary, most-tested reference topology: `pulp` (a derived image with the colocated
signing-service reconciler, docs/adr/0008-colocated-signing-reconciler.md) + `pulpit` (nginx +
pulpit-core + pulpit-worker merged into one image, ADR 0007) + `redis`, one same-origin reverse
proxy in front of all of it (ADR 0005). See `docs/DEPLOYMENT.md` for the full picture (topology
diagram, persistence, secrets, Redis, signing, known issues, production considerations).

## Deploying

Run from the repo root:

```sh
./deployment/docker/generate-env.sh   # generates .env with fresh secrets, prints the admin password once
docker compose -f deployment/docker/compose.yml --env-file .env up -d --build
```

Prefer to set values by hand instead? `./deployment/docker/generate-env.sh` refuses to touch an
existing `.env`, so `cp .env.example .env` and fill in `PULP_SECRET_KEY` (`openssl rand -hex 32`)
and the rest yourself works the same as before.

Open `http://localhost:8080/`. `--env-file .env` is required on every invocation: without
`--project-directory`, relative paths in `compose.yml` (build context, volumes) correctly
resolve against `deployment/docker/` (this file's own directory), but the `.env` lookup
follows the same rule and would otherwise look for `deployment/docker/.env` instead of the
real one at the repo root.

## Two Compose files

`compose.yml` is the reference _deployment_ file: `pulpit` pulls its published
`simonverbois/pulpit` image from Docker Hub (built by `.forgejo/workflows/release.yml`), same
as a real user deploying Pulpit would. `compose-dev.yml` is otherwise identical but builds
`pulpit` from local source instead - see `docs/DEVELOPMENT.md` "Mode B" for the
contributor/local-changes workflow, or just run `make compose-up` (equivalent, with the right
flags already baked in).

## Known gaps

- Not a hardened production deployment as-is - no TLS termination, secrets sourced from a
  `.env` file rather than a real secret manager (`docs/SECURITY.md`,
  `docs/DEPLOYMENT.md` "Production (future work)").
- Single Docker host only - no orchestration, scheduling, or multi-node story (that's
  `deployment/kube/`).
