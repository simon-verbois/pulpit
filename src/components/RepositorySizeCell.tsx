import type { UseQueryResult } from "@tanstack/react-query";
import { Skeleton } from "@patternfly/react-core";

import type { RepositoryContentSize } from "../api/client/pulpitCore/types";
import { formatBytes } from "../lib/formatBytes";

/** One shared cell for every RepositoriesPage's "Size" column - the same
 * hourly-refreshed pulpit-core query (useRepositoryContentSizesQuery),
 * looked up per row by the repository's own pulp_href. No entry (a brand
 * new repository not yet covered by a background run, since every
 * repository always has at least version 0 - see content_size/jobs.py)
 * renders "-", never a fabricated 0. */
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
