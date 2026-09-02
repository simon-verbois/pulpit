import { apiPath, pulpFetch } from "../httpClient";

const BASE = apiPath("/publications/rpm/rpm/");

/**
 * Publishes the repository's latest version (VERIFIED: async, 202 + task).
 * Distributions with `repository` set only ever serve a *publication* of
 * that repository, never repository content directly - without one
 * (`autopublish: false` and no manual publish), the distribution's base_url
 * serves nothing (404), even though the repository has real content
 * (confirmed live: an existing distribution 404'd on `repodata/repomd.xml`
 * until its repository was published).
 */
export function createRpmPublication(repositoryHref: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify({ repository: repositoryHref }),
  });
}
