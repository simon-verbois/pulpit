import { apiPath, pulpFetch } from "./httpClient";
import { buildQuery } from "./queryString";
import type { PulpPage, PulpTask } from "./tasks";

/**
 * A task only records *which* resources it locked or created, never their
 * names - VERIFIED live (pulpcore 3.116): `reserved_resources_record` holds
 * PRNs such as "prn:rpm.rpmrepository:<uuid>" (prefixed "shared:" for a
 * read-only lock, plus a "shared:prn:core.domain:…" lock on every task),
 * `created_resources` holds hrefs. This module turns those into the named
 * repository/remote/distribution a person actually recognizes.
 */
export type TaskResourceKind = "repository" | "remote" | "distribution" | "publication";

export interface TaskResourceRef {
  /** The PRN or href exactly as the task recorded it (minus "shared:"). */
  key: string;
  by: "prn" | "href";
  kind: TaskResourceKind;
  /** Plugin app label, e.g. "rpm", "container", "hugging_face". */
  plugin: string;
  /** Sub-type within the plugin, "" for the plugin's main type (e.g. "uln" for an ULN remote). */
  variant: string;
  exclusive: boolean;
}

const KINDS: TaskResourceKind[] = ["repository", "remote", "distribution", "publication"];

const ENDPOINTS: Record<TaskResourceKind, string> = {
  repository: "repositories",
  remote: "remotes",
  distribution: "distributions",
  publication: "publications",
};

// A plugin's main model is usually "<plugin><kind>" (rpmrepository), but a
// few name theirs differently (pulp_deb's AptRepository, pulp_hugging_face's
// HuggingFaceRepository) - both VERIFIED against the live schema's hrefs.
const MAIN_VARIANT: Record<string, string> = {
  deb: "apt",
  hugging_face: "huggingface",
};

function normalizeVariant(plugin: string, raw: string): string {
  const variant = raw.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const main = MAIN_VARIANT[plugin] ?? plugin.replace(/_/g, "");
  if (variant === main) return "";
  return variant.startsWith(main) ? variant.slice(main.length) : variant;
}

const HREF_PATTERN =
  /\/api\/v3\/(repositories|remotes|distributions|publications)\/([^/]+)\/([^/]+)\/[^/]+\//;

export function parseResourceRecord(record: string): TaskResourceRef | null {
  const exclusive = !record.startsWith("shared:");
  const value = record.replace(/^shared:/, "");

  const prn = /^prn:([a-z0-9_]+)\.([a-z0-9_]+):/.exec(value);
  if (prn) {
    const [, plugin, model] = prn;
    const kind = KINDS.find((candidate) => model.endsWith(candidate));
    if (!kind) return null;
    return {
      key: value,
      by: "prn",
      kind,
      plugin,
      variant: normalizeVariant(plugin, model.slice(0, -kind.length)),
      exclusive,
    };
  }

  const href = HREF_PATTERN.exec(value);
  if (href) {
    const [match, endpoint, plugin, type] = href;
    const kind = KINDS.find((candidate) => ENDPOINTS[candidate] === endpoint)!;
    // A repository *version* href (…/repositories/ansible/ansible/<id>/versions/2/)
    // resolves to its repository - that's the resource a person recognizes.
    const base = value.slice(0, value.indexOf(match) + match.length);
    return {
      key: base,
      by: "href",
      kind,
      plugin,
      variant: normalizeVariant(plugin, type),
      exclusive,
    };
  }

  return null;
}

const KIND_PRIORITY: TaskResourceKind[] = [
  "repository",
  "distribution",
  "remote",
  "publication",
];

function rank(ref: TaskResourceRef): number {
  return (ref.exclusive ? 0 : 10) + KIND_PRIORITY.indexOf(ref.kind);
}

/** Every repository/remote/distribution/publication a task touched, most
 * relevant first: exclusively-locked before shared (a sync locks its
 * repository exclusively and its remote shared), repository before the rest,
 * and resources a create task produced last. De-duplicated by key. */
export function taskResources(task: PulpTask): TaskResourceRef[] {
  const reserved = (task.reserved_resources_record ?? [])
    .map(parseResourceRecord)
    .filter((ref): ref is TaskResourceRef => ref !== null)
    .sort((a, b) => rank(a) - rank(b));
  const created = (task.created_resources ?? [])
    .map(parseResourceRecord)
    .filter((ref): ref is TaskResourceRef => ref !== null)
    .sort((a, b) => rank(a) - rank(b));

  const seen = new Set<string>();
  return [...reserved, ...created].filter((ref) => {
    if (seen.has(ref.key)) return false;
    seen.add(ref.key);
    return true;
  });
}

export function primaryTaskResource(task: PulpTask): TaskResourceRef | undefined {
  return taskResources(task)[0];
}

export interface ResolvedTaskResource {
  name?: string;
  pulp_href: string;
}

interface NamedResource {
  pulp_href: string;
  prn?: string;
  name?: string;
}

/**
 * Looks every ref up in one request per kind and identifier type, through
 * the generic cross-plugin list endpoints (`/repositories/`, `/remotes/`,
 * `/distributions/`, `/publications/`), which all accept `prn__in` and
 * `pulp_href__in` (VERIFIED live). A ref missing from the result was deleted
 * since the task ran - callers show its type alone for that case.
 */
export async function resolveTaskResources(
  refs: TaskResourceRef[],
): Promise<Record<string, ResolvedTaskResource>> {
  const groups = new Map<string, TaskResourceRef[]>();
  for (const ref of refs) {
    const groupKey = `${ref.kind}|${ref.by}`;
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), ref]);
  }

  const pages = await Promise.all(
    [...groups.values()].map((group) => {
      const { kind, by } = group[0];
      const keys = [...new Set(group.map((ref) => ref.key))];
      return pulpFetch<PulpPage<NamedResource>>(
        `${apiPath(`/${ENDPOINTS[kind]}/`)}${buildQuery({
          [by === "prn" ? "prn__in" : "pulp_href__in"]: keys.join(","),
          fields: kind === "publication" ? "pulp_href,prn" : "pulp_href,prn,name",
          limit: keys.length,
        })}`,
      );
    }),
  );

  const resolved: Record<string, ResolvedTaskResource> = {};
  for (const page of pages) {
    for (const resource of page.results) {
      const entry = { name: resource.name, pulp_href: resource.pulp_href };
      resolved[resource.pulp_href] = entry;
      if (resource.prn) resolved[resource.prn] = entry;
    }
  }
  return resolved;
}
