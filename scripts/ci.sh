#!/usr/bin/env sh
# Platform-agnostic CI entrypoint (docs/DEVELOPMENT.md: this repo is not on
# GitHub, so there's no .github/workflows to assume - point whatever CI
# runner you use at this script, or at `make check`).
set -eu

npm ci
npm run lint
npm run typecheck
npm run test
npm run build
