# Docker Compose

The primary, most-tested reference topology: `pulp` (a derived image with the colocated
signing-service reconciler, docs/adr/0008-colocated-signing-reconciler.md) + `pulpit` (nginx +
pulpit-core + pulpit-worker merged into one image, ADR 0007) + `redis`, one same-origin reverse
proxy in front of all of it (ADR 0005). See `docs/DEPLOYMENT.md` for the full picture (topology
diagram, persistence, secrets, Redis, signing, known issues, production considerations).

The shipped manifests impose no container CPU/RAM limits or reservations.
Storage volume capacities remain explicit; see [deployment resource allocation](../../docs/DEPLOYMENT.md#cpu-and-memory-allocation).

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

- Not a hardened production deployment as-is - nginx does terminate TLS itself on 8443 (self-signed
  by default, see `docs/DEPLOYMENT.md` "TLS"), but secrets are still sourced from a `.env` file
  rather than a real secret manager (`docs/SECURITY.md`, `docs/DEPLOYMENT.md`
  "Production (future work)").
- Single Docker host only - no orchestration, scheduling, or multi-node story (that's
  `deployment/kube/`).

## Local outbound proxy and ULN reproduction

The optional `compose-proxy.yml` adds Squid to the existing stack without
restarting Pulp or Pulpit:

```sh
docker compose -f deployment/docker/compose-dev.yml -f deployment/docker/compose-proxy.yml --env-file .env up -d --no-deps squid
```

In **Administration > Global Proxy Settings**, set **Proxy URL** to
`http://squid:3128` and save. Existing and new remotes, including ULN login,
use this global policy automatically. Squid has no proxy credentials, and TLS
validation should remain enabled. Do not use `localhost:3128` inside Pulp:
that refers to the Pulp container itself. The host-only diagnostic address
is `http://127.0.0.1:3128`.

Edit `squid/allowed-domains.txt` to allow additional repository hosts (including
redirect targets), then reload Squid:

```sh
docker compose -f deployment/docker/compose-dev.yml -f deployment/docker/compose-proxy.yml --env-file .env exec squid squid -k reconfigure
docker compose -f deployment/docker/compose-dev.yml -f deployment/docker/compose-proxy.yml --env-file .env logs -f squid
```

The initial Internet allowlist contains only `linux-update.oracle.com`.
HTTP/HTTPS use ports 80/443; other destinations and ports receive HTTP 403.
Filtering follows Squid's [domain ACL](https://www.squid-cache.org/Doc/config/acl/):
HTTPS is tunneled using CONNECT, so this setup filters destination hostnames,
not encrypted URL paths, and does not inspect TLS. The `uln-fixture` hostname
is also allowed for the optional local reproduction below. This proxy does
not impose a network firewall on Pulp; clearing the global proxy allows
direct connections unless the host network itself blocks them.

Quick host checks (clear any `NO_PROXY` bypass):

```sh
curl --noproxy '' --proxy http://127.0.0.1:3128 -I https://linux-update.oracle.com/
curl --noproxy '' --proxy http://127.0.0.1:3128 -I http://example.com/
```

To reproduce a slow ULN login without real Oracle credentials, start the
synthetic endpoint:

```sh
ULN_FIXTURE_LOGIN_DELAY=70 docker compose -f deployment/docker/compose-dev.yml -f deployment/docker/compose-proxy.yml --env-file .env --profile proxy-repro up -d --no-deps uln-fixture
```

Create a separate ULN remote in Pulpit with these settings:

| Field               | Value                                    |
| ------------------- | ---------------------------------------- |
| Name                | ULN proxy diagnostic (dummy credentials) |
| Channel URL         | `uln://test-channel`                     |
| ULN server base URL | `http://uln-fixture/`                    |
| ULN username        | `dummy`                                  |
| ULN password        | `dummy`                                  |

Use dummy credentials only. The fixture discards request bodies without
logging them. It returns a synthetic session key and minimal metadata, and
must not be used for syncs or as evidence that Oracle authentication works.
Click **Test** and inspect Squid and fixture logs. For an API comparison,
PATCH the fixture remote with `{"total_timeout": 5}`. A 70-second login exceeds
Pulpit's 45-second probe limit. The independent ULN login session is covered
by the global proxy/CA policy and the outer probe deadline; it does not use
the remote's download timeout. The structured timeout response arrives before
the reference nginx proxy's 60-second read timeout.

Return the fixture to immediate responses with:

```sh
ULN_FIXTURE_LOGIN_DELAY=0 docker compose -f deployment/docker/compose-dev.yml -f deployment/docker/compose-proxy.yml --env-file .env --profile proxy-repro up -d --no-deps uln-fixture
```

`ULN_FIXTURE_METADATA_DELAY` separately delays the metadata download. Changes
to either delay require recreating the fixture through `up -d` as above.
Keep the proxy overlay in subsequent full-stack Compose commands. Before
stopping Squid, clear or replace the proxy in Global Proxy
Settings; those saved settings outlive the proxy container.
