/**
 * Compile-time-only drift check between a hand-written Pulp response type
 * (`src/api/client/*\/types.ts`) and the corresponding component Pulp's own
 * live OpenAPI schema actually describes (`src/api/generated/`, ADR 0004).
 *
 * `Schema` is a generated schema component (e.g.
 * `components["schemas"]["rpm.RpmRepositoryResponse"]`); `Hand` is our
 * curated, narrower hand-written interface for the same resource. Checks
 * only that every field `Hand` claims to exist is actually a key of
 * `Schema` - not each field's exact type (optional/nullable variance
 * between the two would produce noisy false positives for little real
 * value; a renamed/removed field is the drift that actually breaks this
 * app, and that's what this catches).
 *
 * Usage, right after the interface it checks:
 * ```ts
 * type _RpmRepositoryDrift = AssertFieldsExist<
 *   components["schemas"]["rpm.RpmRepositoryResponse"],
 *   RpmRepository
 * >;
 * ```
 * A compile error here ("Type 'true' is not assignable to type 'never'")
 * means the named hand-written interface has a field Pulp's real schema no
 * longer has - refresh the schema (`npm run api:fetch && npm run api:generate`)
 * and update the interface.
 *
 * Type-only: erased at compile time, zero runtime/bundle cost, and never
 * itself a reason a build fails silently - if `Hand` is ever wider than
 * `Schema`, the assertion line using this type fails to compile, which is
 * exactly the point.
 */
export type AssertFieldsExist<Schema, Hand> = keyof Hand extends keyof Schema
  ? true
  : never;
