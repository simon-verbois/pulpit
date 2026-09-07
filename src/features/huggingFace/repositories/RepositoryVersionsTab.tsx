import { useQuery } from "@tanstack/react-query";
import { Pagination, Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { listRepositoryVersions } from "../../../api/client/hugging_face/repositories";
import type { HuggingFaceRepository } from "../../../api/client/hugging_face/types";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { StatusIndicator } from "../../../components/StatusIndicator";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { formatRelativeTime } from "../../../lib/relativeTime";
import { huggingFaceRepositoryVersionsKey } from "./queryKeys";

export function RepositoryVersionsTab({
  repository,
}: {
  repository: HuggingFaceRepository;
}) {
  const pagination = usePulpPagination();
  const versionsQuery = useQuery({
    queryKey: huggingFaceRepositoryVersionsKey(repository.versions_href, {
      limit: pagination.limit,
      offset: pagination.offset,
    }),
    queryFn: () =>
      listRepositoryVersions(repository.versions_href, {
        limit: pagination.limit,
        offset: pagination.offset,
        // Newest first - versions accumulate, most admins care about recent ones.
        ordering: "-number",
      }),
  });

  return (
    <>
      {versionsQuery.isPending ? (
        <LoadingState label="Loading repository versions" />
      ) : null}
      {versionsQuery.isError ? (
        <ErrorState error={versionsQuery.error} onRetry={() => versionsQuery.refetch()} />
      ) : null}
      {versionsQuery.isSuccess && versionsQuery.data.results.length === 0 ? (
        <EmptyState
          variant="sm"
          title="No versions yet"
          body="A repository gets its first version once content is synced or added to it."
        />
      ) : null}
      {versionsQuery.isSuccess && versionsQuery.data.results.length > 0 ? (
        <>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem align={{ default: "alignEnd" }}>
                <Pagination
                  itemCount={versionsQuery.data?.count ?? 0}
                  page={pagination.page}
                  perPage={pagination.perPage}
                  onSetPage={pagination.onSetPage}
                  onPerPageSelect={pagination.onPerPageSelect}
                  isCompact
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <Table aria-label="Repository versions" variant="compact">
            <Thead>
              <Tr>
                <Th>Version</Th>
                <Th>Created</Th>
                <Th>Content</Th>
              </Tr>
            </Thead>
            <Tbody>
              {versionsQuery.data.results.map((version) => {
                const isCurrent = version.pulp_href === repository.latest_version_href;
                // Best-effort key guess (no synced sample in this dev instance
                // to confirm against, unlike file.file/rpm.package which were
                // VERIFIED live) - falls back to a plain dash if wrong, same
                // as any other unrecognized key.
                const fileCount =
                  version.content_summary?.present?.["hugging_face.hugging-face"]?.count;
                return (
                  <Tr key={version.pulp_href}>
                    <Td dataLabel="Version">
                      Version {version.number}
                      {isCurrent ? (
                        <>
                          {" "}
                          <StatusIndicator color="blue" isCompact>
                            Current
                          </StatusIndicator>
                        </>
                      ) : null}
                    </Td>
                    <Td dataLabel="Created">
                      {formatRelativeTime(version.pulp_created)}
                    </Td>
                    <Td dataLabel="Content">
                      {fileCount !== undefined ? `${fileCount} files` : "—"}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </>
      ) : null}
    </>
  );
}
