# Generated API types

Everything under this directory is produced by `npm run api:generate` (which runs
`openapi-typescript` against a schema fetched by `npm run api:fetch`) from a **live** Pulp
instance's OpenAPI schema. See ADR 0004 and `docs/PULP_API.md`.

**Do not hand-edit anything generated into this directory.** If the generated types are wrong or
unusable for some endpoint, fix it in the hand-written adapter layer (`src/api/client/`) or the
generation step (`scripts/api/`), not here.

Each subdirectory (`core/`, `rpm/`, `container/`, `ansible/`, `certguard/`) holds the types for
that one component's schema only, via Pulp's `?component=<name>` OpenAPI filtering - VERIFIED live
(`docs/PULP_API.md` "OpenAPI schema discovery") and used here specifically because the combined
schema is unwieldy at its real size (900+ endpoints / several MB - see that section's ReDoc
performance findings, the same size problem shows up here). `core/` is pulpcore's own schema, not
a combined fallback; `certguard/` (pulp_certguard: x509/RHSM content guards) is its own installable
component, not part of `core`.

These files ARE committed (unlike the raw fetched schema JSON under `src/api/schemas/`, which is
gitignored and regenerated on demand) - they're the actual pipeline output meant to be consumed,
so they should be available without needing a reachable Pulp instance just to typecheck. Re-run
`npm run api:fetch && npm run api:generate` against a live instance and commit the diff to refresh
them; a stale generated file is a documentation/type-checking gap, not a runtime risk.

Every `src/api/client/*/types.ts` file has a compile-time-only `AssertFieldsExist` check (see
`src/api/client/schemaDriftCheck.ts`) against these generated types, right after each hand-written
interface it covers - a failing one names exactly which hand-written type has drifted from what
Pulp's live schema actually has.
