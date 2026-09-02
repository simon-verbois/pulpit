# syntax=docker/dockerfile:1
#
# pulpit-core API image. Deliberately does NOT install the `gnupg` package
# and is never given the signing GNUPGHOME volume (compose.yml) - it has no
# code path to private key material by construction (no volume) as well as
# by convention (app.modules.signing.gpg_local is only imported, lazily,
# from job handler bodies that only pulpit-worker ever calls - see
# app/modules/signing/jobs.py). See docs/adr/0006-pulpit-core-backend.md.

FROM python:3.12-slim AS base
WORKDIR /app
RUN groupadd --system pulpit && useradd --system --gid pulpit --create-home pulpit

COPY pyproject.toml ./
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./
RUN pip install --no-cache-dir .

USER pulpit
EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
