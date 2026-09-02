import { apiPath, pulpFetch } from "../httpClient";

const BASE = apiPath("/ansible/copy/");

/**
 * Copies a repository version's entire content to another repository -
 * same generic `{config}` shape as RPM's `rpm/copy/` (see
 * src/api/client/rpm/copy.ts). Prefer
 * `copyCollectionVersions`/`repositories.ts`'s `copy_collection_version`
 * action for copying specific collection versions with signing support;
 * this generic endpoint is the "promote this whole version forward" case.
 */
export function copyAnsibleContent(
  sourceRepositoryVersionHref: string,
  destRepositoryHref: string,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify({
      config: [
        {
          source_repo_version: sourceRepositoryVersionHref,
          dest_repo: destRepositoryHref,
        },
      ],
    }),
  });
}
