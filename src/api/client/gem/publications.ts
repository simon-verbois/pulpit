import { apiPath, pulpFetch } from "../httpClient";

const BASE = apiPath("/publications/gem/gem/");

/**
 * Publishes the repository's latest version (VERIFIED: async, 202 + task).
 * Like Hugging Face, this repository has no `autopublish` field at all - a
 * publish here is always this explicit, manual step (see
 * usePublishGemRepositoryMutation).
 */
export function createGemPublication(repositoryHref: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify({ repository: repositoryHref }),
  });
}
