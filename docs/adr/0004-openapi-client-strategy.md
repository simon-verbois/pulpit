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
generated types in src/api/generated/{core,rpm,container,ansible,certguard}/
      |
      v
small, explicit, hand-written typed adapters in src/api/client/ (each type
checked, not derived, against its generated counterpart - schemaDriftCheck.ts)
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

`npm run api:fetch` downloads five schemas from a running dev Pulp instance - one per component
(`core`, `rpm`, `container`, `ansible`, `certguard`) via Pulp's `?component=<name>` OpenAPI
filtering, VERIFIED live (`docs/PULP_API.md` "OpenAPI schema discovery") to actually scope the
schema, not just the combined one filtered client-side. `certguard` (pulp_certguard: x509/RHSM
content guards) is its own installable component, not part of `core`'s own schema - needed once
`src/api/client/administration/types.ts`'s `CertContentGuard` got its own drift check. `npm run
api:generate` runs `openapi-typescript` against each into its own
`src/api/generated/<component>/schema.d.ts`. These require a reachable Pulp instance (typically
the local Compose stack) and are documented in `docs/PULP_API.md` / the `pulp-api` skill.

Generated files are never hand-edited. If generated types are wrong or
unusable for a given endpoint, fix it in the adapter layer (`src/api/client/`) or the generation
config — not by patching the generated file.

Every hand-written type in `src/api/client/*/types.ts` is checked, not derived, against its
generated counterpart: `src/api/client/schemaDriftCheck.ts`'s `AssertFieldsExist<Schema, Hand>`
compiles to `never` (a build failure at the assertion site, naming the interface) if `Hand` claims
a field `Schema` doesn't have. Deliberately field-_existence_ only, not each field's exact type -
see that file's docstring for why, and the "Consequences" section below for why this is a
checkpoint next to the hand-written types, not a rewrite of them (`Pick<Schema, keyof Hand>`-style
derivation was considered and rejected).

**Resolved** (was previously left open): the fetched OpenAPI schema JSON itself
(`src/api/schemas/*.json`) stays gitignored - purely an intermediate, trivially regenerated. The
_generated_ types (`src/api/generated/*/schema.d.ts`) ARE checked in, so they're available (for
reading, for a future compatibility check, for `tsc`) without needing a reachable Pulp instance.
Decided after actually fetching and generating against a live instance (pulpcore 3.116.1, this
project's dev Compose stack) rather than assuming:

- Combined schema: 903 paths / 1247 operations / 4.8 MB. Split per component: core 640 KB, rpm
  376 KB, container 312 KB, ansible 504 KB, certguard well under 50 KB of generated types - each
  individually reasonable to read, diff, and check in.
- **Zero `operationId` collisions** across all 1247 operations on this instance - the collision
  risk this ADR originally flagged as a reason to avoid full SDK generation did not materialize
  here. Worth re-checking if a full-SDK-generator alternative (Orval etc.) is ever revisited, but
  it's not the blocker it was assumed to be.
- `deprecated` IS populated by pulpcore in practice, at both the operation level (37 deprecated
  operations found) and, more finely, the individual _field_ level within a schema (e.g.
  `rpm.RpmRepositoryResponse.metadata_checksum_type`, `.package_checksum_type`, `.gpgcheck` are
  each individually marked `@deprecated` with a migration note in their description) - richer
  signal than expected, relevant to any future API-compatibility-surfacing feature.
- `npx tsc --noEmit` on every generated file, standalone and as part of the full project, is
  clean.
- **Every existing hand-written type in `src/api/client/*/types.ts` (~70 interfaces/types across
  5 files) passed its `AssertFieldsExist` check against this live schema with zero drift found**
  (see "Consequences" below) - direct evidence those types, and their scattered "VERIFIED live"
  comments, are still accurate against pulpcore 3.116.1 / pulp_rpm 3.38.5 / pulp_container 2.29.0
  / pulp_ansible 0.30.0, not just at whatever earlier version they were first written against.
- One deliberate divergence the check correctly did NOT flag (it only checks field _names_ exist,
  see schemaDriftCheck.ts): `rpm.ContentSummaryResponse`'s `added`/`removed`/`present` values are
  typed `Record<string, never>` by the generator (DRF spectacular can't introspect a raw JSONField
  further), while the hand-written `ContentSummary` correctly types them as
  `{ count: number; href: string }` from sampling real synced data. The hand-written type is more
  accurate here, not out of date - confirms the earlier "each one should be checked, not
  bulk-replaced" call was right, not just caution for its own sake.
- Unrelated to this migration, but found while reading `rpm.RpmRemoteResponse`/
  `ansible.CollectionRemoteResponse`/`container.ContainerRemoteResponse` etc. directly: every
  Remote type already has native `ca_cert`/`client_cert`/`client_key` fields ("A PEM encoded CA
  certificate used to validate the server certificate presented by the remote server"). **Acted
  on**: VERIFIED live in pulpcore's own `DownloaderFactory` (`ca_cert` builds one `SSLContext`
  per Remote's aiohttp session, trusted in addition to the system CA bundle, shared by the proxy
  and origin server exactly like `tls_validation`) that this is a strict superset of what the old
  `trusted_ca` module's docker-exec/`update-ca-trust` mechanism achieved for this app's one actual
  use case (trusting a corporate TLS-inspecting proxy) - that module has been removed and replaced
  by `DefaultSettings.proxy_ca_cert`, applied per-Remote the same way `proxy_tls_validation`
  already was. `client_cert`/`client_key` (mTLS) remain unexposed - out of scope, no current
  use case for them in this app.

## Alternatives considered

- **Hand-written TypeScript interfaces for every Pulp model**: guaranteed to drift from the real
  API and expensive to maintain across 4 plugins. Rejected.
- **Full SDK generation (Orval or similar) from day one**: attractive in principle, but untested
  against Pulp's actual combined schema at bootstrap time, and the brief specifically warns
  against forcing an unreliable generator. Deferred pending an actual test.
- **GraphQL layer in front of Pulp**: would require a server component, violating ADR 0001.
  Rejected outright.

## Consequences

- Type generation requires a reachable Pulp API (local Compose stack or documented alternative)
  **to refresh**; the checked-in output itself needs nothing further to read or `tsc`-check.
- The adapter layer is where API quirks get absorbed, which keeps feature code simple and keeps
  "what did Pulp actually return" debuggable in one place per resource.
- Every `src/api/client/*/types.ts` file now imports its generated schema module, but only for
  the compile-time `AssertFieldsExist` drift check (schemaDriftCheck.ts) placed right next to each
  interface - the hand-written types themselves were deliberately left untouched, not rewritten to
  extend/`Pick` from the generated ones. A field-existence check (not a full structural rewrite)
  was chosen specifically because `ContentSummaryResponse` (see "Resolved" above) shows the
  generated shape is sometimes _less_ accurate than the hand-curated one; deriving from it directly
  would have silently replaced a correct type with a worse one for that case, and there was no way
  to know in advance which other types might have the same issue without checking each by hand -
  exactly the per-file review this ADR already called for, just via a cheaper mechanism than a full
  rewrite.
- Revisiting the generator choice (e.g., adopting Orval) is expected to happen eventually; when it
  does, update this ADR rather than silently changing the pipeline.
