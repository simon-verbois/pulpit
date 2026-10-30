import { apiPath, pulpFetch } from "./httpClient";
import { buildQuery } from "./queryString";
import { collectPulpPages } from "./pagination";
import type { PulpPage } from "./tasks";
import type { RepositoryKind } from "./repositoryMembership";

export interface RepositoryOperationSource {
  pulp_href: string;
  name: string;
  remote?: string | null;
  package_signing_service?: string | null;
  metadata_signing_service?: string | null;
}

const REMOTES: Partial<Record<RepositoryKind, string[]>> = {
  rpm: ["rpm/rpm", "rpm/uln"],
  container: ["container/container"],
  ansible: ["ansible/collection", "ansible/git", "ansible/role"],
  file: ["file/file", "file/git"],
  deb: ["deb/apt"],
  python: ["python/python"],
  gem: ["gem/gem"],
  npm: ["npm/npm"],
  maven: ["maven/maven"],
  huggingFace: ["hugging_face/hugging-face"],
};

export function repositoryKindFromHref(href: string): RepositoryKind {
  const component = href.match(/\/repositories\/([^/]+)\//)?.[1];
  if (component === "hugging_face") return "huggingFace";
  if (component && component in REMOTES) return component as RepositoryKind;
  throw new Error("This repository does not support synchronization in Pulpit.");
}

export async function listSyncRemotes(kind: RepositoryKind) {
  const pages = await Promise.all(
    (REMOTES[kind] ?? []).map((collection) =>
      collectPulpPages((offset) =>
        pulpFetch<PulpPage<{ pulp_href: string; name: string }>>(
          `${apiPath(`/remotes/${collection}/`)}${buildQuery({ limit: 100, offset, fields: "pulp_href,name" })}`,
        ),
      ).then((items) =>
        items.map((item) => ({
          ...item,
          label: `${item.name} (${collection.split("/")[1]})`,
        })),
      ),
    ),
  );
  return pages.flat();
}

export interface RepositorySyncOptions {
  remote?: string;
  mirror?: boolean;
  sync_policy?: "additive" | "mirror_complete" | "mirror_content_only";
  skip_types?: ("srpm" | "treeinfo")[];
  optimize?: boolean;
  signed_only?: boolean;
}

export function syncRepository(href: string, options: RepositorySyncOptions) {
  return pulpFetch<{ task: string }>(`${href}sync/`, {
    method: "POST",
    body: JSON.stringify(options),
  });
}
