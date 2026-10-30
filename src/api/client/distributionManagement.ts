import { apiPath, pulpFetch } from "./httpClient";
import { buildQuery } from "./queryString";
import { collectPulpPages } from "./pagination";
import type { PulpPage } from "./tasks";
import type { RepositoryKind } from "./repositoryMembership";

const COLLECTIONS: Record<RepositoryKind, string> = {
  rpm: "rpm/rpm",
  container: "container/container",
  ansible: "ansible/ansible",
  file: "file/file",
  deb: "deb/apt",
  python: "python/pypi",
  gem: "gem/gem",
  maven: "maven/maven",
  npm: "npm/npm",
  huggingFace: "hugging_face/hugging-face",
};
const PUBLICATIONS: Partial<Record<RepositoryKind, string>> = {
  rpm: "rpm/rpm",
  file: "file/file",
  deb: "deb/apt",
  python: "python/pypi",
  gem: "gem/gem",
  huggingFace: "hugging_face/hugging-face",
};

export interface DistributionSummary {
  pulp_href: string;
  name: string;
  base_path: string;
  repository?: string | null;
  repository_version?: string | null;
  publication?: string | null;
  remote?: string | null;
  content_guard?: string | null;
  hidden?: boolean;
  checkpoint?: boolean;
  private?: boolean;
  description?: string | null;
  allow_uploads?: boolean;
  generate_repo_config?: boolean;
}
export interface DistributionWrite {
  name: string;
  base_path: string;
  repository?: string | null;
  repository_version?: string | null;
  publication?: string | null;
  remote?: string | null;
  content_guard?: string | null;
  hidden?: boolean;
  checkpoint?: boolean;
  private?: boolean;
  description?: string | null;
  allow_uploads?: boolean;
  generate_repo_config?: boolean;
}
export interface PublicationOption {
  pulp_href: string;
  repository: string;
  repository_version: string;
  pulp_created?: string;
}
export interface VersionOption {
  pulp_href: string;
  number: number;
  pulp_created?: string;
}

function distributionCollection(kind: RepositoryKind) {
  return apiPath(`/distributions/${COLLECTIONS[kind]}/`);
}
export function publicationCollection(kind: RepositoryKind) {
  const collection = PUBLICATIONS[kind];
  return collection ? apiPath(`/publications/${collection}/`) : undefined;
}
export function distributionKindFromHref(href: string): RepositoryKind {
  const match = Object.entries(COLLECTIONS).find(([, collection]) =>
    href.includes(`/distributions/${collection}/`),
  );
  if (!match) throw new Error("Unsupported distribution type.");
  return match[0] as RepositoryKind;
}
export function getDistribution(href: string) {
  return pulpFetch<DistributionSummary>(href);
}

export async function findDistributionMatches(
  kind: RepositoryKind,
  name: string,
  basePath: string,
  ignoreHref?: string,
) {
  const queries = await Promise.all([
    pulpFetch<PulpPage<DistributionSummary>>(
      `${apiPath("/distributions/")}${buildQuery({ name, limit: 100 })}`,
    ),
    pulpFetch<PulpPage<DistributionSummary>>(
      `${apiPath("/distributions/")}${buildQuery({ base_path: basePath, limit: 100 })}`,
    ),
  ]);
  const matches = [
    ...new Map(
      queries
        .flatMap((page) => page.results)
        .filter((item) => item.pulp_href !== ignoreHref)
        .map((item) => [item.pulp_href, item]),
    ).values(),
  ];
  // A generic distribution list doesn't contain every plugin-specific target.
  // Read the real object before deciding whether it is safe to reconnect.
  return Promise.all(
    matches.map(async (item) => ({
      distribution: await getDistribution(item.pulp_href),
      sameKind: item.pulp_href.includes(`/distributions/${COLLECTIONS[kind]}/`),
    })),
  );
}

export function isUnusedDistribution(distribution: DistributionSummary) {
  return (
    !distribution.repository &&
    !distribution.repository_version &&
    !distribution.publication &&
    !distribution.remote
  );
}

export function saveDistribution(
  kind: RepositoryKind,
  data: DistributionWrite,
  href?: string,
) {
  return pulpFetch<{ task: string }>(href ?? distributionCollection(kind), {
    method: href ? "PATCH" : "POST",
    body: JSON.stringify(data),
  });
}

export function listDistributionVersions(repositoryHref: string) {
  return collectPulpPages((offset) =>
    pulpFetch<PulpPage<VersionOption>>(
      `${repositoryHref}versions/${buildQuery({ limit: 100, offset, ordering: "-number" })}`,
    ),
  );
}
export async function listDistributionPublications(
  kind: RepositoryKind,
  repositoryHref: string,
) {
  const base = publicationCollection(kind);
  if (!base) return [];
  const publications = await collectPulpPages((offset) =>
    pulpFetch<PulpPage<PublicationOption>>(
      `${base}${buildQuery({ limit: 100, offset })}`,
    ),
  );
  return publications.filter(
    (item) =>
      item.repository === repositoryHref ||
      item.repository_version.startsWith(`${repositoryHref}versions/`),
  );
}

/** Include version/publication targets whose distribution.repository is null. */
export async function listRepositoryDistributions<T extends DistributionSummary>(
  kind: RepositoryKind,
  repositoryHref: string,
  limit: number,
  offset: number,
): Promise<PulpPage<T>> {
  const all = await collectPulpPages((pageOffset) =>
    pulpFetch<PulpPage<T>>(
      `${distributionCollection(kind)}${buildQuery({ limit: 100, offset: pageOffset })}`,
    ),
  );
  const candidates = [
    ...new Set(all.flatMap((item) => (item.publication ? [item.publication] : []))),
  ];
  const related = new Set<string>();
  for (let index = 0; index < candidates.length; index += 8) {
    const publications = await Promise.all(
      candidates
        .slice(index, index + 8)
        .map((href) => pulpFetch<PublicationOption>(href)),
    );
    for (const item of publications)
      if (
        item.repository === repositoryHref ||
        item.repository_version.startsWith(`${repositoryHref}versions/`)
      )
        related.add(item.pulp_href);
  }
  const matches = all.filter(
    (item) =>
      item.repository === repositoryHref ||
      item.repository_version?.startsWith(`${repositoryHref}versions/`) ||
      (item.publication && related.has(item.publication)),
  );
  return {
    count: matches.length,
    next: null,
    previous: null,
    results: matches.slice(offset, offset + limit),
  };
}
