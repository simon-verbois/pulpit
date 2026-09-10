import type { UseQueryResult } from "@tanstack/react-query";
import { Skeleton } from "@patternfly/react-core";

import type { RepositoryContentSize } from "../api/client/pulpitCore/types";
import { formatBytes } from "../lib/formatBytes";

/** Shared size lookup from the caller's Pulp queries. Missing or inaccessible
 * data renders a dash rather than claiming that the repository is empty. */
export function RepositorySizeCell({
  query,
  repositoryHref,
}: {
  query: UseQueryResult<RepositoryContentSize[]>;
  repositoryHref: string;
}) {
  if (query.isPending) {
    return <Skeleton width="3rem" screenreaderText="Loading size" />;
  }
  if (query.isError) {
    return <>—</>;
  }
  const entry = query.data.find((size) => size.repository_href === repositoryHref);
  return <>{entry ? formatBytes(entry.size_bytes) : "—"}</>;
}
