import { apiPath, pulpFetch } from "../httpClient";

// VERIFIED live: this plugin's publication collection lives under
// `.../pypi/`, not `.../python/` (matching distributions.ts's own quirk).
const BASE = apiPath("/publications/python/pypi/");

/**
 * Publishes the repository's latest version (VERIFIED: async, 202 + task).
 * Distributions with `repository` set only ever serve a *publication* of
 * that repository, never repository content directly - without one
 * (`autopublish: false` and no manual publish), the distribution's base_url
 * serves nothing (404), same as every other plugin's publish/distribution
 * relationship in this app.
 */
export function createPythonPublication(
  repositoryHref: string,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify({ repository: repositoryHref }),
  });
}
