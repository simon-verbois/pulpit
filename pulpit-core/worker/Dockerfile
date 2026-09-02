# syntax=docker/dockerfile:1
#
# pulpit-worker image. The ONLY image in the whole stack that installs
# `gnupg` and is ever given the signing GNUPGHOME volume (compose.yml) -
# see docs/adr/0006-pulpit-core-backend.md and app/modules/signing/
# gpg_local.py's docstring for the security rationale. Runs its actual
# process as uid/gid 700 (see entrypoint.sh for why that exact number, not
# root and not an arbitrary unprivileged uid).
#
# Also installs `rpm`/`rpmsign` (Debian's `rpm` package - VERIFIED it
# provides both) - needed by app/modules/signing/rpm_resign.py to re-sign an
# already-downloaded package locally as part of resigning existing content
# on key publish (docs/signing.md "How resigning actually works"). This is
# in addition to, not instead of, the GPG-based on-upload signing script
# `pulp` itself runs (signing-scripts/sign_rpm_package.sh) - both invoke the
# same shared GNUPGHOME, just from two different processes for two
# different purposes.

FROM python:3.12-slim AS base
WORKDIR /app

RUN apt-get update \
    && apt-get install --no-install-recommends -y gnupg rpm \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app ./app
COPY worker ./worker
RUN pip install --no-cache-dir .

COPY signing-scripts /opt/pulpit-signing-scripts
RUN chmod 0755 /opt/pulpit-signing-scripts/*.sh

COPY worker/entrypoint.sh /usr/local/bin/pulpit-worker-entrypoint.sh
RUN chmod +x /usr/local/bin/pulpit-worker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/pulpit-worker-entrypoint.sh"]
CMD ["python", "-m", "worker.main"]
