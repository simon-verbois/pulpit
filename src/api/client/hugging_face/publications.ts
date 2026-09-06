import { apiPath, pulpFetch } from "../httpClient";

const BASE = apiPath("/publications/hugging_face/hugging-face/");

/**
 * Publishes the repository's latest version (VERIFIED: async, 202 + task).
 * Unlike RPM/File, this repository has no `autopublish` field at all - a
 * publish here is always this explicit, manual step (see
 * usePublishHuggingFaceRepositoryMutation).
 */
export function createHuggingFacePublication(
  repositoryHref: string,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify({ repository: repositoryHref }),
  });
}
