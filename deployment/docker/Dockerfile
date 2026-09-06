# syntax=docker/dockerfile:1
#
# Single `pulpit` image: nginx (static SPA + reverse proxy) + pulpit-core
# (FastAPI API) + pulpit-worker (job queue, signing automation) all in one
# container - see docs/adr/0007-merged-pulpit-container.md for why (an
# internal tool doesn't need pulpit-core/pulpit-worker's process-level
# isolation as much as a multi-tenant deployment would, and 3 fewer
# containers/images is a real operational simplification). Only Pulp itself
# stays a separate, externally-addressable service (${PULP_UPSTREAM}, plain
# host:port - deployment/docker/pulpit/entrypoint.sh).
#
# Built from the repo root as context (not this file's own directory) -
# `docker build -f deployment/docker/Dockerfile .` from the repo root, or
# via deployment/docker/compose.yml, which sets this up automatically -
# because it needs pulpit-core/ and the frontend sources below, both
# outside this directory.
#
# Deliberately Debian (python:3.12-slim), not nginx:stable-alpine + a
# separate Python stage: pulpit-core/pulpit-worker's own toolchain
# (gnupg, rpm - see below) is already apt-based and VERIFIED to work on
# this exact base; installing nginx via the same apt toolchain is one
# consistent base image instead of mixing package managers/libc (glibc vs
# musl) across what is now a single runtime.

# Stage 1: build static frontend assets. Node only exists at build time
# (ADR 0001) - never part of the runtime image.
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Empty by default (compose.yml's published-image build never sets this) -
# only deployment/docker/compose-dev.yml passes it, to show a thin
# dev-build banner (src/app/layout/DevBanner.tsx) so a locally-built image
# is never mistaken for the published release. VITE_-prefixed so Vite
# bakes it into the client bundle - not a secret, just a build identifier.
ARG VITE_DEV_BANNER=""
ENV VITE_DEV_BANNER=$VITE_DEV_BANNER
# Timezone the dev banner's build timestamp is rendered in (vite.config.ts
# reads process.env.TZ at build time) - defaults to UTC so a build with no
# TZ passed still produces a valid, labeled timestamp instead of silently
# using whatever zone the build host happens to be in.
ARG TZ="UTC"
ENV TZ=$TZ
RUN npm run build

# Stage 2: runtime.
FROM python:3.12-slim AS runtime
WORKDIR /app

# Overridable at `docker run`/Compose/Kubernetes time, same as
# PULP_UPSTREAM below - correct log/timestamp rendering for nginx and
# pulpit-core/pulpit-worker, independent of the frontend build's own TZ
# arg above (which only affects the baked-in dev banner string).
ARG TZ="UTC"
ENV TZ=$TZ

# gnupg + rpm: signing automation (app/modules/signing/rpm_resign.py docstring
# - Debian's `rpm` package provides both `rpm` and `rpmsign`). nginx +
# gettext-base (envsubst): the reverse proxy + its own config templating
# (deployment/docker/pulpit/entrypoint.sh - no nginx.org Docker image here,
# so its usual envsubst-on-templates machinery is reimplemented by hand
# there). tzdata: without it, glibc has no /usr/share/zoneinfo to resolve
# the TZ env var above against and silently falls back to UTC instead of
# erroring - this package is what actually makes TZ take effect.
RUN apt-get update \
    && apt-get install --no-install-recommends -y gnupg rpm nginx gettext-base curl tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

# `pulpit-signing` (gid 700, matching pulpcore-worker's own uid/gid inside
# the `pulp` image - docs/signing.md "Shared volume permissions") is a
# SUPPLEMENTARY group for `pulpit`, not its primary one - GNUPGHOME stays
# owned uid/gid 700 mode 0700 (owner-only, ignores group entirely), so this
# does NOT give `pulpit` (uvicorn/migrations) any access to private key
# material. It's needed for the *embedded SQLite* database instead
# (/var/lib/pulpit, entrypoint.sh): BUG FOUND LIVE - `pulpit` (API) and the
# worker loop (uid/gid 700) both read/write that one file, and SQLite's
# WAL-mode `-wal`/`-shm` sidecar files get created/rewritten by whichever
# of the two happens to be active, sometimes ending up owned `700:700` -
# without `pulpit` also being a *member* of group 700, it has zero access
# (not owner, not in group) to a file it doesn't happen to own at that
# moment.
RUN groupadd --system pulpit \
    && groupadd --gid 700 pulpit-signing \
    && useradd --system --gid pulpit --groups pulpit-signing --create-home pulpit

COPY pulpit-core/pyproject.toml ./
COPY pulpit-core/app ./app
COPY pulpit-core/worker ./worker
COPY pulpit-core/migrations ./migrations
COPY pulpit-core/alembic.ini ./
RUN pip install --no-cache-dir .

COPY pulpit-core/signing-scripts /opt/pulpit-signing-scripts
RUN chmod 0755 /opt/pulpit-signing-scripts/*.sh

COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY deployment/docker/nginx/pulpit.conf.template /etc/nginx/pulpit.conf.template

COPY deployment/docker/pulpit/entrypoint.sh /usr/local/bin/pulpit-entrypoint.sh
RUN chmod +x /usr/local/bin/pulpit-entrypoint.sh

# Overridable at `docker run`/Compose/Kubernetes time.
ENV PULP_UPSTREAM=pulp:80
# Embedded SQLite by default (no separate DB container needed) - point this
# at a real Postgres instead to keep using one, e.g. a pre-existing
# deployment's own database (app/core/config/settings.py).
ENV PULPIT_CORE_DATABASE_URL=sqlite:////var/lib/pulpit/pulpit-core.db

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/pulpit-entrypoint.sh"]
