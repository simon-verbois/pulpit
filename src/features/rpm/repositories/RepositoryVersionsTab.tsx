import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Pagination,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { listRepositoryVersions } from "../../../api/client/rpm/repositories";
import type { RpmRepository } from "../../../api/client/rpm/types";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { StatusIndicator } from "../../../components/StatusIndicator";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { formatRelativeTime } from "../../../lib/relativeTime";
import { rpmRepositoryVersionsKey } from "./queryKeys";
import { CopyContentModal } from "./CopyContentModal";

export function RepositoryVersionsTab({ repository }: { repository: RpmRepository }) {
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const pagination = usePulpPagination();
  const versionsQuery = useQuery({
    queryKey: rpmRepositoryVersionsKey(repository.versions_href, {
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
        <Table aria-label="Repository versions" variant="compact">
          <Thead>
            <Tr>
              <Th>Version</Th>
              <Th>Created</Th>
              <Th>Content</Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {versionsQuery.data.results.map((version) => {
              const isCurrent = version.pulp_href === repository.latest_version_href;
              const packageCount =
                version.content_summary?.present?.["rpm.package"]?.count;
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
                  <Td dataLabel="Created">{formatRelativeTime(version.pulp_created)}</Td>
                  <Td dataLabel="Content">
                    {packageCount !== undefined ? `${packageCount} packages` : "—"}
                  </Td>
                  <Td dataLabel="Actions" isActionCell>
                    {isCurrent ? (
                      <Button variant="link" onClick={() => setIsCopyOpen(true)}>
                        Copy to…
                      </Button>
                    ) : null}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      ) : null}

      {isCopyOpen ? (
        <CopyContentModal
          sourceRepositoryHref={repository.pulp_href}
          sourceRepositoryVersionHref={repository.latest_version_href}
          onClose={() => setIsCopyOpen(false)}
        />
      ) : null}
    </>
  );
}
