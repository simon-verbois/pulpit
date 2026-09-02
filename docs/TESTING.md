# Testing strategy

This covers the `pulpit` frontend. `pulpit-core`'s own backend test suite (pytest, ADR 0006) is
documented separately in `docs/signing.md` and `pulpit-core/tests/` - in short: `cd pulpit-core &&
pip install -e ".[dev]" && PULPIT_CORE_DATABASE_URL=<disposable Postgres> pytest`, following this
project's same "mocks are a convenience, real integration is mandatory" policy (respx for the Pulp
HTTP boundary, a real disposable Postgres for everything else, and one real, non-mocked GPG round
trip).

## Unit tests (Vitest)

Cover pure logic and hooks that don't need a rendered UI:

- API utility functions and adapters (`src/api/client/`).
- Error normalization (`src/api/errors/`).
- Task polling helpers (`src/api/tasks/`).
- Non-trivial hooks (e.g. capability detection).

## Component tests (Vitest + React Testing Library)

Cover components with real behavioral branches, especially the shared state components and
feature views:

- Loading / empty / error rendering for shared `LoadingState`/`EmptyState`/`ErrorState`.
- Permission-state rendering (e.g. a 403 response rendering the forbidden state, not a crash).
- Key feature views, mocked at the network boundary with MSW (see below) using response shapes
  captured/verified from a real Pulp instance — not invented fixtures.

Avoid tests that only assert implementation details (e.g. "this hook calls `useState` once");
test observable behavior (rendered output, calls to the mocked network layer).

## End-to-end tests (Playwright)

Run against the composed stack (`docker compose up`) or `npm run dev` + a reachable Pulp:

- Application loads at `/`.
- Primary navigation works (Overview, Repositories submenus, Tasks, Access, Administration).
- System Status page reaches the real Pulp `/pulp/api/v3/status/` and renders real data.
- Major routes render without crashing (including plugin-not-installed states).
- A simulated Pulp outage/error produces the controlled error UI, not a blank page or an
  unhandled exception.
- `/ui/` is not exposed as pulp-ui in the composed deployment (returns 404 per ADR 0005).
- Login/logout: bad credentials show an error and don't authenticate; correct credentials reach
  the app; an unauthenticated visit to any protected route redirects to `/login`; logging out
  actually invalidates the session server-side, not just client-side (`e2e/auth.spec.ts`).

E2E specs live in `e2e/`. `npm run test:e2e` / `make test-e2e` runs them headlessly, and requires
`PULP_ADMIN_PASSWORD` to be set (env var or `.env`) so the `setup` project (`e2e/auth.setup.ts`)
can log in as the Pulp admin and save a reusable session (`playwright/.auth/`, gitignored) that
the rest of the suite runs with — see `docs/AUTHENTICATION.md`. `e2e/auth.spec.ts` itself runs
without that stored session, since it's exercising the login/logout flow directly.

## Interactive browser inspection vs. Playwright test files

Driving and inspecting the real rendered UI during development — navigation, forms, tables,
responsive behavior, accessibility, screenshots — is a development/verification activity, not a
substitute for the checked-in Playwright test suite that runs in CI/`make test-e2e`. Both are
expected to happen; only the latter is a merge gate.

## Mocking policy

MSW (`msw`) may be used for unit/component tests where a real Pulp instance isn't practical to
spin up per-test. Rules:

- Mock response shapes must reflect actual captured/verified Pulp API responses (from a live
  instance or the live OpenAPI schema), not invented domain models.
- Mocks are a testing convenience, not an architecture: real integration against a local Pulp
  instance (Compose) remains mandatory before considering API-integration work done — see the
  `quality-gate` skill.
- Do not build large speculative fake datasets; keep fixtures minimal and traceable to a real
  response.

## What "done" requires

Relevant unit/component tests must pass, and for UI changes, an actual browser verification pass
(Playwright) must have been done — not just "the code compiles."
