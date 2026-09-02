import { pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  GalaxyNamespace,
  GalaxyNamespaceCreate,
  GalaxyNamespaceUpdate,
  PulpPage,
} from "./types";

// VERIFIED live schema: this is the *editable* Galaxy-API namespace, scoped
// to one distribution's own Galaxy-compatible API mount - not a global
// resource, and not the same thing as the read-only `content/ansible/
// namespaces/` content type (see types.ts's GalaxyNamespace doc comment).
// "default" here is Pulp's (always-present) domain name, not the
// distribution - a same-origin relative URL, not built through `apiPath`
// (see search.ts for the same rationale).
function base(distributionBasePath: string): string {
  return `/pulp_ansible/galaxy/default/api/v3/plugin/ansible/content/${encodeURIComponent(distributionBasePath)}/namespaces/`;
}

export interface ListGalaxyNamespacesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
}

/** VERIFIED live: the *list* response is a normal Pulp pagination envelope
 * (count/next/previous/results) - only the cross-repo search endpoint
 * (search.ts) uses the Galaxy-v3 meta/links/data shape. Each item's own
 * `pulp_href` points at the read-only `content/ansible/namespaces/`
 * resource (VERIFIED live: PATCH there is rejected, 405) - update/delete
 * must go back through this same by-name URL instead (see
 * updateGalaxyNamespace/deleteGalaxyNamespace below), not the href in the
 * list/get response. */
export function listGalaxyNamespaces(
  distributionBasePath: string,
  params: ListGalaxyNamespacesParams,
): Promise<PulpPage<GalaxyNamespace>> {
  return pulpFetch<PulpPage<GalaxyNamespace>>(
    `${base(distributionBasePath)}${buildQuery(params)}`,
  );
}

/** Builds the request body for create/update - multipart (with an avatar
 * file) or plain JSON, matching whichever fits the data given. `links` can
 * only be sent on the JSON (no-avatar) path - multipart array-of-objects
 * encoding isn't attempted here, a deliberate scope cut for this first
 * pass. */
function buildNamespaceBody(data: GalaxyNamespaceCreate | GalaxyNamespaceUpdate): {
  body: BodyInit;
  isMultipart: boolean;
} {
  if (data.avatar) {
    const formData = new FormData();
    if (data.name !== undefined) formData.append("name", data.name);
    if (data.company !== undefined) formData.append("company", data.company);
    if (data.email !== undefined) formData.append("email", data.email);
    if (data.description !== undefined) formData.append("description", data.description);
    if (data.resources !== undefined) formData.append("resources", data.resources);
    formData.append("avatar", data.avatar);
    return { body: formData, isMultipart: true };
  }
  const { avatar: _avatar, ...jsonData } = data;
  return { body: JSON.stringify(jsonData), isMultipart: false };
}

/** VERIFIED live schema/instance: create is asynchronous (202 + task),
 * unlike most other "create" endpoints in this app. */
export function createGalaxyNamespace(
  distributionBasePath: string,
  data: GalaxyNamespaceCreate,
): Promise<{ task: string }> {
  const { body } = buildNamespaceBody(data);
  return pulpFetch<{ task: string }>(base(distributionBasePath), {
    method: "POST",
    body,
  });
}

/** VERIFIED live: also asynchronous (202 + task). Addressed by
 * distribution + name, not the object's own `pulp_href` (see
 * listGalaxyNamespaces's doc comment - that href 405s on PATCH). */
export function updateGalaxyNamespace(
  distributionBasePath: string,
  name: string,
  data: GalaxyNamespaceUpdate,
): Promise<{ task: string }> {
  const { body } = buildNamespaceBody(data);
  return pulpFetch<{ task: string }>(
    `${base(distributionBasePath)}${encodeURIComponent(name)}/`,
    {
      method: "PATCH",
      body,
    },
  );
}

/** VERIFIED live: asynchronous (202 + task) on success; Pulp still rejects
 * synchronously (400) if the namespace still has collections associated
 * with it - a real, surfaced validation error, not something Pulpit
 * pre-checks itself. */
export function deleteGalaxyNamespace(
  distributionBasePath: string,
  name: string,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(
    `${base(distributionBasePath)}${encodeURIComponent(name)}/`,
    {
      method: "DELETE",
    },
  );
}
