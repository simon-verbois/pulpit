import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  HuggingFaceRemote,
  HuggingFaceRemoteCreate,
  HuggingFaceRemoteUpdate,
} from "./types";

const BASE = apiPath("/remotes/hugging_face/hugging-face/");

export interface ListHuggingFaceRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listHuggingFaceRemotes(
  params: ListHuggingFaceRemotesParams,
): Promise<PulpPage<HuggingFaceRemote>> {
  return pulpFetch<PulpPage<HuggingFaceRemote>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every remote page - used to populate the small "remote" select in
 * the repository create form, which isn't expected to have hundreds of
 * remotes in this bootstrap's scope. */
export async function listAllHuggingFaceRemotes(): Promise<HuggingFaceRemote[]> {
  const page = await listHuggingFaceRemotes({ limit: 100, offset: 0 });
  return page.results;
}

export function createHuggingFaceRemote(
  data: HuggingFaceRemoteCreate,
): Promise<HuggingFaceRemote> {
  return pulpFetch<HuggingFaceRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteHuggingFaceRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: update is asynchronous (202 + task),
 * same as repository update - never assume PATCH mirrors POST's sync/async
 * behavior. */
export function updateHuggingFaceRemote(
  href: string,
  data: HuggingFaceRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
