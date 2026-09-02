# Generated API types

Everything under this directory is produced by `npm run api:generate` (which runs
`openapi-typescript` against a schema fetched by `npm run api:fetch`) from a **live** Pulp
instance's OpenAPI schema. See ADR 0004 and `docs/PULP_API.md`.

**Do not hand-edit anything generated into this directory.** If the generated types are wrong or
unusable for some endpoint, fix it in the hand-written adapter layer (`src/api/client/`) or the
generation step (`scripts/api/`), not here.

Subdirectories (`core/`, `rpm/`, `container/`, `ansible/`) exist to hold a per-plugin split of the
schema once per-component OpenAPI filtering has been verified against a live instance (see
`docs/PULP_API.md` "OpenAPI schema discovery"). Until that's confirmed, `npm run api:generate`
writes the combined schema's types into `core/`.
