#!/usr/bin/env sh
# Frontend quality-gate entrypoint, used by .forgejo/workflows/release.yml
# and safe to run locally (equivalent to `make check`, see AGENTS.md).
set -eu

npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
