import { useQuery } from "@tanstack/react-query";

import { getRepositoryContentSizes } from "../api/client/pulpitCore/contentSize";

/** Shared by every RepositoriesPage (RPM/Ansible/Container) - one query,
 * cached under one key, looked up per row by the repository's own
 * pulp_href. Refreshed hourly by a pulpit-core background job, never
 * computed live (see useComponentSizesQuery / docs/UX.md "per-plugin
 * storage-size breakdown"). */
export function useRepositoryContentSizesQuery() {
  return useQuery({
    queryKey: ["pulpit-core", "content-size", "repository-sizes"],
    queryFn: getRepositoryContentSizes,
  });
}
