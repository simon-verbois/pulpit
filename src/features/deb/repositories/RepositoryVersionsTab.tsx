import { useQuery } from "@tanstack/react-query";

import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { ListToolbar } from "../../../components/ListToolbar";
import { listRepositoryVersions } from "../../../api/client/deb/repositories";
import type { DebRepository } from "../../../api/client/deb/types";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { formatRelativeTime } from "../../../lib/relativeTime";
import { debRepositoryVersionsKey } from "./queryKeys";

export function RepositoryVersionsTab({ repository }: { repository: DebRepository }) {
  const pagination = usePulpPagination();
  const versionsQuery = useQuery({
    queryKey: debRepositoryVersionsKey(repository.versions_href, {
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
    // Sync can be triggered by another session, the Pulp scheduler, or an
    // API caller with nothing in this browser to invalidate this query -
    // poll so a new version from outside this session shows up without F5.
    refetchInterval: 15000,
  });

  return (
    <>
      {versionsQuery.isPending ? (
        <LoadingState
          columns={["Version", "Created", "Content"]}
          label="Loading repository versions"
        />
      ) : null}
      {versionsQuery.isError ? (
        <ErrorState error={versionsQuery.error} onRetry={() => versionsQuery.refetch()} />
      ) : null}
      {versionsQuery.isSuccess &&
      versionsQuery.data.results.length === 0 &&
      pagination.page === 1 ? (
        <EmptyState
          variant="sm"
          title="No versions yet"
          body="A repository gets its first version once content is synced or added to it."
        />
      ) : null}
      {versionsQuery.isSuccess &&
      (versionsQuery.data.results.length > 0 || pagination.page > 1) ? (
        <>
          <ListToolbar
            pagination={pagination}
            itemCount={versionsQuery.data?.count ?? 0}
          />
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
                // to confirm against) - falls back to a plain dash if wrong,
                // same as any other unrecognized key.
                const packageCount =
                  version.content_summary?.present?.["deb.package"]?.count;
                return (
                  <Tr
                    key={version.pulp_href}
                    className={isCurrent ? "pulpit-row-current" : undefined}
                  >
                    <Td dataLabel="Version">Version {version.number}</Td>
                    <Td dataLabel="Created">
                      {formatRelativeTime(version.pulp_created)}
                    </Td>
                    <Td dataLabel="Content">
                      {packageCount !== undefined ? `${packageCount} packages` : "—"}
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
