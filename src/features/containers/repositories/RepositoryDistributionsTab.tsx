import { EditDistributionButton } from "../../../components/EditDistributionButton";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { containerDistributionDeletesRepository } from "../../../api/client/container/distributions";
import { useNavigate } from "react-router-dom";
import { Button, ToolbarItem } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { ListToolbar } from "../../../components/ListToolbar";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { TaskActionButton } from "../../../components/TaskActionButton";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import type {
  ContainerDistribution,
  ContainerRepository,
} from "../../../api/client/container/types";
import { useContainerDistributionsQuery } from "../distributions/useContainerDistributionsQuery";
import { useDeleteContainerDistributionMutation } from "../distributions/useDeleteContainerDistributionMutation";
import { CreateDistributionModal } from "../distributions/CreateDistributionModal";

export function RepositoryDistributionsTab({
  repository,
}: {
  repository: ContainerRepository;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ContainerDistribution | null>(null);
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteContainerDistributionMutation();
  const deleteImpact = useQuery({
    queryKey: [
      "pulp",
      "container",
      "distribution-delete-impact",
      pendingDelete?.pulp_href,
    ],
    queryFn: () => containerDistributionDeletesRepository(pendingDelete!),
    enabled: Boolean(pendingDelete),
    staleTime: 0,
  });
  const navigate = useNavigate();

  const distributionsQuery = useContainerDistributionsQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    repository: repository.pulp_href,
  });

  return (
    <>
      {distributionsQuery.isPending ? (
        <LoadingState
          columns={["Name", "Base path", "Pull command", "Actions"]}
          label="Loading distributions"
        />
      ) : null}
      {distributionsQuery.isError ? (
        <ErrorState
          error={distributionsQuery.error}
          onRetry={() => distributionsQuery.refetch()}
        />
      ) : null}
      {distributionsQuery.isSuccess &&
      distributionsQuery.data.results.length === 0 &&
      pagination.page === 1 ? (
        <EmptyState
          variant="sm"
          title="No distributions yet"
          body="Create a distribution so podman/docker clients can pull this repository's content."
          action={
            <Button onClick={() => setIsCreateOpen(true)}>Create distribution</Button>
          }
        />
      ) : null}
      {distributionsQuery.isSuccess &&
      (distributionsQuery.data.results.length > 0 || pagination.page > 1) ? (
        <>
          <ListToolbar pagination={pagination} itemCount={distributionsQuery.data.count}>
            <ToolbarItem>
              <Button onClick={() => setIsCreateOpen(true)}>Create distribution</Button>
            </ToolbarItem>
          </ListToolbar>
          <Table aria-label="Distributions" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Base path</Th>
                <Th>Pull command</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {distributionsQuery.data.results.map((distribution) => (
                <Tr key={distribution.pulp_href}>
                  <Td dataLabel="Name">{distribution.name}</Td>
                  <Td dataLabel="Base path">{distribution.base_path}</Td>
                  <Td dataLabel="Pull command">{`podman pull ${distribution.registry_path}`}</Td>
                  <Td dataLabel="Actions" isActionCell hasAction>
                    <EditDistributionButton
                      distributionHref={distribution.pulp_href}
                      repositoryHref={repository.pulp_href}
                      repositoryName={repository.name}
                    />
                    <TaskActionButton
                      resourceHref={distribution.pulp_href}
                      taskAction="delete"
                      variant="link"
                      isDanger
                      onClick={() => setPendingDelete(distribution)}
                    >
                      Delete
                    </TaskActionButton>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      ) : null}

      {isCreateOpen ? (
        <CreateDistributionModal
          repositoryHref={repository.pulp_href}
          repositoryName={repository.name}
          onClose={() => setIsCreateOpen(false)}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="distribution"
          itemLabel={pendingDelete.name}
          warning={
            deleteImpact.data
              ? `Deleting this distribution also deletes "${repository.name}" itself, including all its synced content.`
              : undefined
          }
          isConfirmDisabled={!deleteImpact.isSuccess}
          isDeleting={deleteMutation.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() =>
            deleteMutation.mutate(
              { href: pendingDelete.pulp_href, name: pendingDelete.name },
              {
                onSuccess: () => {
                  setPendingDelete(null);
                  if (deleteImpact.data) navigate("/containers/repositories");
                },
              },
            )
          }
        >
          {deleteImpact.isPending ? (
            <LoadingState label="Checking deletion impact" />
          ) : null}
          {deleteImpact.isError ? (
            <ErrorState
              error={deleteImpact.error}
              onRetry={() => deleteImpact.refetch()}
            />
          ) : null}
        </ConfirmDeleteModal>
      ) : null}
    </>
  );
}
