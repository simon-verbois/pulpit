import { apiPath, pulpFetch } from "./httpClient";
import { buildQuery } from "./queryString";
import { collectPulpPages } from "./pagination";
import type { PulpPage } from "./tasks";

export type CopyKind = "rpm" | "ansible" | "container";
export interface ContentTypeOption {
  id: string;
  label: string;
  endpoint: string;
  fields: string;
}
export const COPY_CONTENT_TYPES: Record<CopyKind, ContentTypeOption[]> = {
  rpm: [
    {
      id: "packages",
      label: "Packages",
      endpoint: "rpm/packages",
      fields: "name,version,release,arch",
    },
    {
      id: "advisories",
      label: "Advisories",
      endpoint: "rpm/advisories",
      fields: "id,title,version",
    },
    {
      id: "packagegroups",
      label: "Package groups",
      endpoint: "rpm/packagegroups",
      fields: "id,name",
    },
    {
      id: "packagecategories",
      label: "Package categories",
      endpoint: "rpm/packagecategories",
      fields: "id,name",
    },
    {
      id: "packageenvironments",
      label: "Package environments",
      endpoint: "rpm/packageenvironments",
      fields: "id,name",
    },
    {
      id: "packagelangpacks",
      label: "Language packs",
      endpoint: "rpm/packagelangpacks",
      fields: "",
    },
    {
      id: "modulemds",
      label: "Modules",
      endpoint: "rpm/modulemds",
      fields: "name,stream,version,arch,context",
    },
    {
      id: "modulemd_defaults",
      label: "Module defaults",
      endpoint: "rpm/modulemd_defaults",
      fields: "module,stream",
    },
    {
      id: "modulemd_obsoletes",
      label: "Module obsoletes",
      endpoint: "rpm/modulemd_obsoletes",
      fields: "module_name,module_stream",
    },
    {
      id: "distribution_trees",
      label: "Distribution trees",
      endpoint: "rpm/distribution_trees",
      fields: "release_name,release_version,arch",
    },
    {
      id: "repo_metadata_files",
      label: "Metadata files",
      endpoint: "rpm/repo_metadata_files",
      fields: "relative_path,data_type",
    },
  ],
  ansible: [
    {
      id: "collections",
      label: "Collections",
      endpoint: "ansible/collection_versions",
      fields: "namespace,name,version",
    },
    {
      id: "roles",
      label: "Roles",
      endpoint: "ansible/roles",
      fields: "namespace,name,version",
    },
  ],
  container: [
    { id: "tags", label: "Tags", endpoint: "container/tags", fields: "name" },
    {
      id: "manifests",
      label: "Manifests",
      endpoint: "container/manifests",
      fields: "digest,media_type",
    },
  ],
};
export interface ContentChoice {
  href: string;
  value: string;
  label: string;
}

export async function listCopyContent(
  kind: CopyKind,
  typeId: string,
  versionHref: string,
): Promise<ContentChoice[]> {
  const type = COPY_CONTENT_TYPES[kind].find((item) => item.id === typeId);
  if (!type) throw new Error("Choose a supported content type.");
  const records = await collectPulpPages((offset) =>
    pulpFetch<PulpPage<Record<string, unknown> & { pulp_href: string }>>(
      `${apiPath(`/content/${type.endpoint}/`)}${buildQuery({ repository_version: versionHref, fields: ["pulp_href", type.fields].filter(Boolean).join(","), limit: 1000, offset })}`,
    ),
  );
  return records.map((item) => {
    const label = type.fields
      .split(",")
      .map((field) => item[field])
      .filter((value) => typeof value === "string" || typeof value === "number")
      .join(" · ");
    const nativeValue =
      kind === "container" ? item[typeId === "tags" ? "name" : "digest"] : item.pulp_href;
    if (typeof nativeValue !== "string")
      throw new Error("Pulp returned content without its required identifier.");
    return { href: item.pulp_href, value: nativeValue, label: label || item.pulp_href };
  });
}
