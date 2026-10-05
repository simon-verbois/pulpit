import { apiPath, pulpFetch } from "./httpClient";
import { buildQuery } from "./queryString";

export type RepositoryKind =
  | "ansible"
  | "container"
  | "deb"
  | "file"
  | "gem"
  | "huggingFace"
  | "maven"
  | "npm"
  | "python"
  | "rpm";

export interface ContentRepository {
  pulp_href: string;
  name: string;
}

interface RepositoryPage {
  count: number;
  next: string | null;
  results: ContentRepository[];
}

const REPOSITORY_COLLECTIONS: Record<RepositoryKind, string> = {
  ansible: "/repositories/ansible/ansible/",
  container: "/repositories/container/container/",
  deb: "/repositories/deb/apt/",
  file: "/repositories/file/file/",
  gem: "/repositories/gem/gem/",
  huggingFace: "/repositories/hugging_face/hugging-face/",
  maven: "/repositories/maven/maven/",
  npm: "/repositories/npm/npm/",
  python: "/repositories/python/python/",
  rpm: "/repositories/rpm/rpm/",
};

/**
 * Lists repositories whose latest version contains this content unit.
 *
 * `latest_with_content` is provided by pulpcore's repository list filter and
 * was VERIFIED in the live schema for every collection above. Using it avoids
 * claiming that content removed from a repository is still linked merely
 * because it remains in an older retained repository version.
 */
export async function listRepositoriesContainingContent(
  kind: RepositoryKind,
  contentHref: string,
): Promise<ContentRepository[]> {
  const base = apiPath(REPOSITORY_COLLECTIONS[kind]);
  const limit = 100;
  const repositories: ContentRepository[] = [];

  for (let offset = 0; ; offset += limit) {
    const page = await pulpFetch<RepositoryPage>(
      `${base}${buildQuery({
        latest_with_content: contentHref,
        fields: "pulp_href,name",
        ordering: "name",
        limit,
        offset,
      })}`,
    );
    repositories.push(...page.results);
    if (repositories.length >= page.count || page.results.length === 0) {
      return repositories;
    }
  }
}
