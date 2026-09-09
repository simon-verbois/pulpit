import { apiPath, pulpFetch } from "./httpClient";
// Browser-derived content totals. A component with
// no entry (not a 0-byte entry) means no content of that type has ever been
// seen - see that module's models.py docstring.
export interface ComponentContentSize {
  component: string;
  size_bytes: number;
  updated_at: string;
}

// Same idea, one entry per repository (its latest version) - keyed by the
// repository's own pulp_href, which every RepositoriesPage already has.
export interface RepositoryContentSize {
  repository_href: string;
  size_bytes: number;
  updated_at: string;
}

interface Page<T> {
  results: T[];
  next: string | null;
}
interface Artifact {
  pulp_href: string;
  size: number;
}
interface Content {
  pulp_href: string;
  artifacts: Record<string, string | null>;
}
interface Repository {
  pulp_href: string;
  latest_version_href: string | null;
}

export const contentSizeKeys = {
  all: ["pulp", "content-sizes"] as const,
  components: ["pulp", "content-sizes", "components"] as const,
  repositories: ["pulp", "content-sizes", "repositories"] as const,
};

async function all<T>(
  suffix: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<T[]> {
  const results: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const query = new URLSearchParams({
      ...params,
      limit: "1000",
      offset: String(offset),
    });
    const page = await pulpFetch<Page<T>>(`${apiPath(suffix)}?${query}`, { signal });
    results.push(...page.results);
    if (!page.next) return results;
    if (!page.results.length)
      throw new Error("Pulp returned an empty page with a next page");
  }
}

async function artifacts(signal?: AbortSignal) {
  return new Map(
    (await all<Artifact>("/artifacts/", { fields: "pulp_href,size" }, signal)).map(
      (artifact) => [artifact.pulp_href, artifact.size],
    ),
  );
}

function size(content: Content, sizes: Map<string, number>): number {
  return Object.values(content.artifacts).reduce(
    (total, href) => total + (href ? (sizes.get(href) ?? 0) : 0),
    0,
  );
}

export async function getComponentContentSizes(
  signal?: AbortSignal,
): Promise<ComponentContentSize[]> {
  const sizes = await artifacts(signal);
  const content = await all<Content>(
    "/content/",
    { fields: "pulp_href,artifacts" },
    signal,
  );
  const totals = new Map<string, number>();
  for (const item of content) {
    const component = item.pulp_href.split("/content/")[1]?.split("/")[0];
    if (component)
      totals.set(component, (totals.get(component) ?? 0) + size(item, sizes));
  }
  const updated_at = new Date().toISOString();
  return [...totals].map(([component, size_bytes]) => ({
    component,
    size_bytes,
    updated_at,
  }));
}

export async function getRepositoryContentSizes(
  signal?: AbortSignal,
): Promise<RepositoryContentSize[]> {
  // Pulp filters this list using the caller's permissions. No privileged
  // backend cache can reveal repositories belonging to another user.
  const repositories = await all<Repository>(
    "/repositories/",
    { fields: "pulp_href,latest_version_href" },
    signal,
  );
  if (!repositories.length) return [];
  const sizes = await artifacts(signal);
  const result: RepositoryContentSize[] = [];
  // Bound concurrency and memory on large installations; cancellation stops
  // the scan when the page is no longer observed.
  for (const repository of repositories) {
    if (!repository.latest_version_href) continue;
    const content = await all<Content>(
      "/content/",
      {
        fields: "pulp_href,artifacts",
        repository_version: repository.latest_version_href,
      },
      signal,
    );
    result.push({
      repository_href: repository.pulp_href,
      size_bytes: content.reduce((total, item) => total + size(item, sizes), 0),
      updated_at: new Date().toISOString(),
    });
  }
  return result;
}
