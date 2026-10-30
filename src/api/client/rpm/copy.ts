import { apiPath, pulpFetch } from "../httpClient";

const BASE = apiPath("/rpm/copy/");

/**
 * Copies a repository version's entire content to another repository
 * (VERIFIED live: synchronous response envelope, `{task}` not
 * `{task_group}`, unlike ACS refresh/prune - async, 202).
 *
 * Simplified: the real `config` payload supports per-content-type criteria
 * (copy only packages matching X, exclude Y, ...); this always copies the
 * whole source version, which is the common "promote this version forward"
 * case.
 */
export function copyRpmContent(
  sourceRepositoryVersionHref: string,
  destRepositoryHref: string,
  options: {
    content?: string[];
    dependency_solving?: boolean;
    dependency_upgrade?: boolean;
  } = {},
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify({
      config: [
        {
          source_repo_version: sourceRepositoryVersionHref,
          dest_repo: destRepositoryHref,
          ...(options.content ? { content: options.content } : {}),
        },
      ],
      ...(options.dependency_solving !== undefined
        ? { dependency_solving: options.dependency_solving }
        : {}),
      ...(options.dependency_upgrade !== undefined
        ? { dependency_upgrade: options.dependency_upgrade }
        : {}),
    }),
  });
}
