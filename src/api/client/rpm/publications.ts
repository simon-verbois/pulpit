import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, RpmPublicationSummary } from "./types";

const BASE = apiPath("/publications/rpm/rpm/");

export type RpmPublicationCreate =
  | { repository: string; repository_version?: never }
  | { repository?: never; repository_version: string };

const PUBLICATION_LOOKUP_BATCH_SIZE = 100;

/** Resolves only publications referenced by distributions. The live RPM
 * distribution endpoint cannot filter by publication, while this endpoint
 * supports `pulp_href__in`; batching avoids fetching a repository's entire
 * publication history just to identify its pinned distributions. */
export async function listRpmPublicationsByHrefs(
  hrefs: string[],
): Promise<RpmPublicationSummary[]> {
  const uniqueHrefs = [...new Set(hrefs)];
  const results: RpmPublicationSummary[] = [];

  for (
    let index = 0;
    index < uniqueHrefs.length;
    index += PUBLICATION_LOOKUP_BATCH_SIZE
  ) {
    const batch = uniqueHrefs.slice(index, index + PUBLICATION_LOOKUP_BATCH_SIZE);
    const page = await pulpFetch<PulpPage<RpmPublicationSummary>>(
      `${BASE}${buildQuery({
        pulp_href__in: batch.join(","),
        fields: "pulp_href,repository,repository_version",
        limit: batch.length,
        offset: 0,
      })}`,
    );
    results.push(...page.results);
  }

  return results;
}

/**
 * Publishes the repository's latest version (VERIFIED: async, 202 + task).
 * Distributions with `repository` set only ever serve a *publication* of
 * that repository, never repository content directly - without one
 * (`autopublish: false` and no manual publish), the distribution's base_url
 * serves nothing (404), even though the repository has real content
 * (confirmed live: an existing distribution 404'd on `repodata/repomd.xml`
 * until its repository was published).
 */
export function createRpmPublication(
  data: RpmPublicationCreate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
