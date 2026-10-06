import { useQuery } from "@tanstack/react-query";
import {
  Button,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Skeleton,
} from "@patternfly/react-core";

import { pulpFetch } from "../api/client/httpClient";
import { useRepositoryContentSizesQuery } from "../hooks/useRepositoryContentSizesQuery";
import { formatBytes } from "../lib/formatBytes";

/** The fields every plugin's repository version shares. */
interface RepositoryVersionSummary {
  pulp_href: string;
  number: number;
  pulp_created: string;
  content_summary: { present: Record<string, { count: number }> };
}

interface SummaryRepository {
  pulp_href: string;
  latest_version_href: string | null;
  pulp_created: string;
}

/** Readable singular names for content types whose Pulp name is a run-on
 * word; anything else falls back to the type's own name. */
const CONTENT_TYPE_NAMES: Record<string, string> = {
  packagegroup: "package group",
  packagecategory: "package category",
  packageenvironment: "package environment",
  packagelangpacks: "langpacks",
  modulemd: "module",
  modulemd_defaults: "module defaults",
  modulemd_obsolete: "module obsoletes",
  repo_metadata_file: "metadata file",
  distribution_tree: "distribution tree",
};

/** Names that read the same singular and plural. */
const INVARIANT_NAMES = new Set(["langpacks", "module defaults", "module obsoletes"]);

/** "rpm.package" -> "packages", "rpm.packagegroup" -> "package groups". */
function contentTypeLabel(contentType: string, count: number): string {
  const key = contentType.split(".").pop() ?? contentType;
  const name = CONTENT_TYPE_NAMES[key] ?? key.replace(/_/g, " ");
  if (count === 1 || INVARIANT_NAMES.has(name)) return name;
  if (/[^aeiou]y$/.test(name)) return `${name.slice(0, -1)}ies`;
  return name.endsWith("s") ? name : `${name}s`;
}

function formatDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * At-a-glance facts shared by every repository Overview tab - latest
 * version (linked to the Versions tab), what it contains, its size on disk,
 * and when the repository was created. Renders `DescriptionListGroup`s, so it
 * goes inside the caller's own `DescriptionList`. Anything that can't be read
 * renders a dash rather than claiming the repository is empty.
 */
export function RepositorySummary({
  repository,
  onShowVersions,
}: {
  repository: SummaryRepository;
  onShowVersions: () => void;
}) {
  const latestHref = repository.latest_version_href;
  const versionQuery = useQuery({
    queryKey: ["repository-version", latestHref],
    queryFn: () => pulpFetch<RepositoryVersionSummary>(latestHref as string),
    enabled: Boolean(latestHref),
  });
  const sizesQuery = useRepositoryContentSizesQuery();

  const version = versionQuery.data;
  const present = version
    ? Object.entries(version.content_summary.present).filter(([, { count }]) => count > 0)
    : [];
  const size = sizesQuery.data?.find(
    (entry) => entry.repository_href === repository.pulp_href,
  );

  return (
    <>
      <DescriptionListGroup>
        <DescriptionListTerm>Latest version</DescriptionListTerm>
        <DescriptionListDescription>
          {versionQuery.isPending && latestHref ? (
            <Skeleton width="8rem" screenreaderText="Loading latest version" />
          ) : version ? (
            <Button variant="link" isInline onClick={onShowVersions}>
              Version {version.number}
            </Button>
          ) : (
            "—"
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Content</DescriptionListTerm>
        <DescriptionListDescription>
          {versionQuery.isPending && latestHref ? (
            <Skeleton width="10rem" screenreaderText="Loading content summary" />
          ) : !version ? (
            "—"
          ) : present.length === 0 ? (
            "Empty"
          ) : (
            present
              .map(
                ([type, { count }]) =>
                  `${count.toLocaleString()} ${contentTypeLabel(type, count)}`,
              )
              .join(", ")
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Size</DescriptionListTerm>
        <DescriptionListDescription>
          {sizesQuery.isPending ? (
            <Skeleton width="3rem" screenreaderText="Loading size" />
          ) : size ? (
            formatBytes(size.size_bytes)
          ) : (
            "—"
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Created</DescriptionListTerm>
        <DescriptionListDescription>
          {formatDate(repository.pulp_created)}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </>
  );
}
