import { apiPath, pulpFetch } from "../httpClient";

// VERIFIED live: this is the "apt" publication type
// (`/publications/deb/apt/`) - pulp_deb also has a "verbatim" publication
// type (`/publications/deb/verbatim/`), deliberately unsupported here, same
// as this app's other skip-the-advanced-variant calls.
const BASE = apiPath("/publications/deb/apt/");

/**
 * Publishes the repository's latest version (VERIFIED: async, 202 + task).
 * Distributions with `repository` set only ever serve a *publication* of
 * that repository, never repository content directly - without one
 * (`autopublish: false` and no manual publish), the distribution's base_url
 * serves nothing (404), same as every other plugin's publish/distribution
 * relationship in this app.
 */
export function createDebPublication(repositoryHref: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify({ repository: repositoryHref }),
  });
}
