import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { AnsibleRole, PulpPage } from "./types";

const BASE = apiPath("/content/ansible/roles/");
const ARTIFACTS = apiPath("/artifacts/");

export interface ListAnsibleRolesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name?: string;
  namespace?: string;
  repository_version?: string;
}

export function listAnsibleRoles(
  params: ListAnsibleRolesParams,
): Promise<PulpPage<AnsibleRole>> {
  return pulpFetch<PulpPage<AnsibleRole>>(`${BASE}${buildQuery(params)}`);
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Finds (or creates) an Artifact for this file's exact bytes. VERIFIED live:
 * pulpcore's generic `POST /pulp/api/v3/artifacts/` rejects a file whose
 * sha256 already exists in storage with a synchronous 400
 * ("Artifact with sha256 checksum of '...' already exists"), rather than
 * transparently reusing it - unlike RPM packages/collection versions, which
 * dedup content transparently through their own content-specific upload
 * endpoints. Hit for real re-uploading the same role tarball to a second
 * repository. Checking by hash first (`?sha256=`) makes this idempotent.
 */
async function findOrCreateArtifact(file: File): Promise<string> {
  const hash = await sha256Hex(file);
  const existing = await pulpFetch<PulpPage<{ pulp_href: string }>>(
    `${ARTIFACTS}${buildQuery({ sha256: hash, limit: 1, offset: 0 })}`,
  );
  if (existing.results[0]) {
    return existing.results[0].pulp_href;
  }

  const formData = new FormData();
  formData.append("file", file);
  const artifact = await pulpFetch<{ pulp_href: string }>(ARTIFACTS, {
    method: "POST",
    body: formData,
  });
  return artifact.pulp_href;
}

/**
 * Uploads a role tarball to a repository. VERIFIED live schema: unlike
 * `CollectionVersion` (which accepts `file`/`upload`/`artifact` as
 * alternatives) or RPM packages (which have a dedicated `.../upload/`
 * shortcut), `ansible.Role`'s content-create endpoint only accepts a
 * pre-existing `artifact` href - there is no `.../roles/upload/` endpoint.
 * This is therefore a genuine two-step flow:
 *   1. Find-or-create an Artifact for the file's bytes (see
 *      findOrCreateArtifact) - synchronous (201, or a lookup), returns the
 *      Artifact's href.
 *   2. `POST content/ansible/roles/` with that `artifact` href plus
 *      name/namespace/version/repository - synchronous (201, no task),
 *      unlike collection version upload.
 */
export async function uploadAnsibleRole(
  file: File,
  data: { name: string; namespace: string; version: string },
  repositoryHref: string,
): Promise<AnsibleRole> {
  const artifactHref = await findOrCreateArtifact(file);

  return pulpFetch<AnsibleRole>(BASE, {
    method: "POST",
    body: JSON.stringify({
      artifact: artifactHref,
      name: data.name,
      namespace: data.namespace,
      version: data.version,
      repository: repositoryHref,
    }),
  });
}
