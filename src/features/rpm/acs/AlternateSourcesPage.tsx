import { useState } from "react";
import { Button, Flex, FlexItem } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { ListToolbar } from "../../../components/ListToolbar";
import { PageLayout } from "../../../components/PageLayout";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { TaskActionButton } from "../../../components/TaskActionButton";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { formatRelativeTime } from "../../../lib/relativeTime";
import type { RpmAlternateContentSource } from "../../../api/client/rpm/types";
import { useAcsQuery } from "./useAcsQuery";
import { useDeleteAcsMutation } from "./useDeleteAcsMutation";
import { useRefreshAcsMutation } from "./useRefreshAcsMutation";
import { CreateAcsModal } from "./CreateAcsModal";

export function AlternateSourcesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RpmAlternateContentSource | null>(
    null,
  );
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteAcsMutation();
  const refreshMutation = useRefreshAcsMutation();

  const acsQuery = useAcsQuery({ limit: pagination.limit, offset: pagination.offset });

  return (
    <>
      <PageLayout
        title="RPM alternate content sources"
        description="Local mirror sources Pulp checks before reaching out to a remote's real upstream."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>Create alternate source</Button>
        }
      >
        {acsQuery.isPending ? (
          <LoadingState
            columns={["Name", "Paths", "Last refreshed", "Actions"]}
            label="Loading alternate content sources"
          />
        ) : null}
        {acsQuery.isError ? (
          <ErrorState error={acsQuery.error} onRetry={() => acsQuery.refetch()} />
        ) : null}
        {acsQuery.isSuccess &&
        acsQuery.data.results.length === 0 &&
        pagination.page === 1 ? (
          <EmptyState
            title="No alternate content sources yet"
            body="Create one to have Pulp check a local mirror before reaching a remote's real upstream."
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                Create alternate source
              </Button>
            }
          />
        ) : null}
        {acsQuery.isSuccess &&
        (acsQuery.data.results.length > 0 || pagination.page > 1) ? (
          <>
            <ListToolbar pagination={pagination} itemCount={acsQuery.data?.count ?? 0} />
            <Table aria-label="RPM alternate content sources" variant="compact">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Paths</Th>
                  <Th>Last refreshed</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {acsQuery.data.results.map((acs) => (
                  <Tr key={acs.pulp_href}>
                    <Td dataLabel="Name">{acs.name}</Td>
                    <Td dataLabel="Paths">
                      {acs.paths.filter(Boolean).join(", ") || "—"}
                    </Td>
                    <Td dataLabel="Last refreshed">
                      {acs.last_refreshed
                        ? formatRelativeTime(acs.last_refreshed)
                        : "Never"}
                    </Td>
                    <Td dataLabel="Actions" isActionCell>
                      <Flex
                        flexWrap={{ default: "nowrap" }}
                        spaceItems={{ default: "spaceItemsNone" }}
                        justifyContent={{ default: "justifyContentFlexEnd" }}
                      >
                        <FlexItem>
                          <TaskActionButton
                            resourceHref={acs.pulp_href}
                            taskAction="refresh"
                            variant="link"
                            isDisabled={refreshMutation.isPending}
                            onClick={() =>
                              refreshMutation.mutate({
                                href: acs.pulp_href,
                                name: acs.name,
                              })
                            }
                          >
                            Refresh
                          </TaskActionButton>
                        </FlexItem>
                        <FlexItem>
                          <TaskActionButton
                            resourceHref={acs.pulp_href}
                            taskAction="delete"
                            variant="link"
                            isDanger
                            onClick={() => setPendingDelete(acs)}
                          >
                            Delete
                          </TaskActionButton>
                        </FlexItem>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </>
        ) : null}
      </PageLayout>

      {isCreateOpen ? <CreateAcsModal onClose={() => setIsCreateOpen(false)} /> : null}
      {pendingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="alternate content source"
          itemLabel={pendingDelete.name}
          isDeleting={deleteMutation.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() =>
            deleteMutation.mutate(
              { href: pendingDelete.pulp_href, name: pendingDelete.name },
              { onSuccess: () => setPendingDelete(null) },
            )
          }
        />
      ) : null}
    </>
  );
}
