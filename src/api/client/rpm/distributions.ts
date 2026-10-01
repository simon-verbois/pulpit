import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import { listRpmPublicationsByHrefs } from "./publications";
import type {
  PulpPage,
  RpmDistribution,
  RpmDistributionCreate,
  RpmDistributionUpdate,
} from "./types";

const BASE = apiPath("/distributions/rpm/rpm/");
const DISTRIBUTION_SCAN_PAGE_SIZE = 100;

export interface ListRpmDistributionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}

export function listRpmDistributions(
  params: ListRpmDistributionsParams,
): Promise<PulpPage<RpmDistribution>> {
  return pulpFetch<PulpPage<RpmDistribution>>(`${BASE}${buildQuery(params)}`);
}

async function listAllRpmDistributions(): Promise<RpmDistribution[]> {
  const results: RpmDistribution[] = [];

  while (true) {
    const page = await listRpmDistributions({
      limit: DISTRIBUTION_SCAN_PAGE_SIZE,
      offset: results.length,
    });
    results.push(...page.results);
    if (results.length >= page.count || page.results.length === 0) {
      return results;
    }
  }
}

/** Lists every distribution serving this repository, including immutable
 * version-pinned distributions whose Pulp model has `repository: null` and
 * points to an RPM publication instead. Pulp exposes no distribution-side
 * `publication` filter, so the referenced publications are resolved in a
 * bounded batch and the merged result is paginated client-side. */
export async function listRpmRepositoryDistributions(params: {
  repository: string;
  limit: number;
  offset: number;
}): Promise<PulpPage<RpmDistribution>> {
  const allDistributions = await listAllRpmDistributions();
  const publicationHrefs = allDistributions.flatMap((distribution) =>
    distribution.publication ? [distribution.publication] : [],
  );
  const publications = await listRpmPublicationsByHrefs(publicationHrefs);
  const repositoryPublicationHrefs = new Set(
    publications
      .filter((publication) => publication.repository === params.repository)
      .map((publication) => publication.pulp_href),
  );
  const matching = allDistributions.filter(
    (distribution) =>
      distribution.repository === params.repository ||
      (distribution.publication !== null &&
        repositoryPublicationHrefs.has(distribution.publication)),
  );

  return {
    count: matching.length,
    next: null,
    previous: null,
    results: matching.slice(params.offset, params.offset + params.limit),
  };
}

export function createRpmDistribution(
  data: RpmDistributionCreate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteRpmDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED live: like every other RPM PATCH in this app, asynchronous (202 + task). */
export function updateRpmDistribution(
  href: string,
  data: RpmDistributionUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
