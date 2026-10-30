import type { PulpPage } from "./tasks";

/** Read every page without assuming Pulp honors the requested page size. */
export async function collectPulpPages<T>(
  fetchPage: (offset: number) => Promise<PulpPage<T>>,
): Promise<T[]> {
  const results: T[] = [];
  for (;;) {
    const page = await fetchPage(results.length);
    results.push(...page.results);
    if (!page.next) return results;
    if (page.results.length === 0) {
      throw new Error(
        "Pulp returned an empty page with more results pending. Retry the request.",
      );
    }
  }
}
