import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { ListToolbar } from "../../../components/ListToolbar";
import { listRepositoryVersions } from "../../../api/client/ansible/repositories";
import type { AnsibleRepository } from "../../../api/client/ansible/types";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { TaskActionButton } from "../../../components/TaskActionButton";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { formatRelativeTime } from "../../../lib/relativeTime";
import { ansibleRepositoryVersionsKey } from "./queryKeys";
import { CopyContentModal } from "./CopyContentModal";

export function RepositoryVersionsTab({ repository }: { repository: AnsibleRepository }) {
  const [copyVersion, setCopyVersion] = useState<string>();
  const pagination = usePulpPagination();
  const versionsQuery = useQuery({
    queryKey: ansibleRepositoryVersionsKey(repository.versions_href, {
      limit: pagination.limit,
      offset: pagination.offset,
    }),
    queryFn: () =>
      listRepositoryVersions(repository.versions_href, {
        limit: pagination.limit,
        offset: pagination.offset,
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
          columns={["Version", "Created", "Content", "Actions"]}
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
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {versionsQuery.data.results.map((version) => {
                const isCurrent = version.pulp_href === repository.latest_version_href;
                const collectionCount =
                  version.content_summary?.present?.["ansible.collection_version"]?.count;
                const roleCount =
                  version.content_summary?.present?.["ansible.role"]?.count;
                const parts = [
                  collectionCount !== undefined ? `${collectionCount} collections` : null,
                  roleCount !== undefined ? `${roleCount} roles` : null,
                ].filter(Boolean);
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
                      {parts.length > 0 ? parts.join(", ") : "—"}
                    </Td>
                    <Td dataLabel="Actions" isActionCell>
                      {
                        <TaskActionButton
                          resourceHref={repository.pulp_href}
                          taskAction="copy"
                          variant="link"
                          onClick={() => setCopyVersion(version.pulp_href)}
                        >
                          Copy to…
                        </TaskActionButton>
                      }
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </>
      ) : null}

      {copyVersion ? (
        <CopyContentModal
          sourceRepositoryHref={repository.pulp_href}
          sourceRepositoryVersionHref={copyVersion}
          onClose={() => setCopyVersion(undefined)}
        />
      ) : null}
    </>
  );
}
