import { pulpFetch } from "./httpClient";

/**
 * Plugin-agnostic sync: every plugin's `{repository_href}sync/` accepts an
 * optional `remote` and answers 202 + task - VERIFIED against the live
 * schemas of ansible, container, deb, file, gem, hugging_face, npm, python
 * and rpm. Used where only hrefs are known (re-running a failed sync from
 * its task), not as a replacement for the per-plugin sync helpers.
 */
export function syncRepository(
  repositoryHref: string,
  remoteHref: string,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${repositoryHref}sync/`, {
    method: "POST",
    body: JSON.stringify({ remote: remoteHref }),
  });
}
