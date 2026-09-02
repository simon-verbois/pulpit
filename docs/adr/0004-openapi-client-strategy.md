# ADR 0004: OpenAPI-derived types, hand-written adapters, generated code fenced off

## Status

Accepted

## Context

Pulp publishes an OpenAPI schema (see `docs/PULP_API.md` for exact discovery URLs). We don't want
to hand-duplicate Pulp's models in TypeScript (drifts immediately, tedious, error-prone), but full
SDK code generation is risky here: Pulp's combined core+plugin OpenAPI schema is known to contain
operationId collisions, plugin-specific warnings, and shapes some generators handle awkwardly.
Forcing a generator that produces broken or unmaintainable output just because "the architecture
doc says OpenAPI" would violate the project's own "verify, don't assume" principle.

## Decision

Pipeline:

```
Pulp OpenAPI schema
      |
      v
openapi-typescript          (schema -> TypeScript types only, no runtime SDK)
      |
      v
generated types in src/api/generated/{core,rpm,container,ansible}/
      |
      v
small, explicit, hand-written typed adapters in src/api/client/
      |
      v
TanStack Query hooks in each feature
```

`openapi-typescript` was chosen over full-SDK generators (e.g. Orval) as the first candidate
because it only generates types, not request logic — so a messy or colliding schema degrades to
"some types are awkward," not "the generated client doesn't compile or calls the wrong endpoint."
Orval (or another SDK generator) remains an option to revisit **only if**, after actually testing
it against a live Pulp schema, its output is clean and well-scoped per plugin — this has not been
tested yet and must not be assumed to work.

`npm run api:fetch` downloads the current schema(s) from a running dev Pulp instance;
`npm run api:generate` runs `openapi-typescript` against the fetched schema(s) into
`src/api/generated/`. These require a reachable Pulp instance (typically the local Compose stack)
and are documented in `docs/PULP_API.md` / the `pulp-api` skill.

Generated files are never hand-edited. If generated types are wrong or
unusable for a given endpoint, fix it in the adapter layer (`src/api/client/`) or the generation
config — not by patching the generated file.

Whether to check the fetched OpenAPI schema JSON itself into version control (for reproducible
generation without a live Pulp instance) is left open until we've actually inspected the real
schema's size/stability; if it materially helps reproducibility it will be added and this ADR
updated.

## Alternatives considered

- **Hand-written TypeScript interfaces for every Pulp model**: guaranteed to drift from the real
  API and expensive to maintain across 4 plugins. Rejected.
- **Full SDK generation (Orval or similar) from day one**: attractive in principle, but untested
  against Pulp's actual combined schema at bootstrap time, and the brief specifically warns
  against forcing an unreliable generator. Deferred pending an actual test.
- **GraphQL layer in front of Pulp**: would require a server component, violating ADR 0001.
  Rejected outright.

## Consequences

- Type generation requires a reachable Pulp API (local Compose stack or documented alternative);
  this is a documented manual/CI step, not something that happens implicitly at build time.
- The adapter layer is where API quirks get absorbed, which keeps feature code simple and keeps
  "what did Pulp actually return" debuggable in one place per resource.
- Revisiting the generator choice (e.g., adopting Orval) is expected to happen eventually; when it
  does, update this ADR rather than silently changing the pipeline.
