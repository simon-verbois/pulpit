import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  ClipboardCopy,
  Pagination,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
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
  const navigate = useNavigate();

  const distributionsQuery = useContainerDistributionsQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    repository: repository.pulp_href,
  });

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Button onClick={() => setIsCreateOpen(true)}>Create distribution</Button>
          </ToolbarItem>
          <ToolbarItem align={{ default: "alignEnd" }}>
            <Pagination
              itemCount={distributionsQuery.data?.count ?? 0}
              page={pagination.page}
              perPage={pagination.perPage}
              onSetPage={pagination.onSetPage}
              onPerPageSelect={pagination.onPerPageSelect}
              isCompact
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {distributionsQuery.isPending ? (
        <LoadingState label="Loading distributions" />
      ) : null}
      {distributionsQuery.isError ? (
        <ErrorState
          error={distributionsQuery.error}
          onRetry={() => distributionsQuery.refetch()}
        />
      ) : null}
      {distributionsQuery.isSuccess && distributionsQuery.data.results.length === 0 ? (
        <EmptyState
          title="No distributions yet"
          body="Create a distribution so podman/docker clients can pull this repository's content."
          action={
            <Button onClick={() => setIsCreateOpen(true)}>Create distribution</Button>
          }
        />
      ) : null}
      {distributionsQuery.isSuccess && distributionsQuery.data.results.length > 0 ? (
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
                <Td dataLabel="Pull command">
                  <ClipboardCopy isReadOnly hoverTip="Copy" clickTip="Copied">
                    {`podman pull ${distribution.registry_path}`}
                  </ClipboardCopy>
                </Td>
                <Td dataLabel="Actions" isActionCell>
                  <Button
                    variant="link"
                    isDanger
                    onClick={() => setPendingDelete(distribution)}
                  >
                    Delete
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
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
          // VERIFIED live: deleting a container distribution also deletes
          // the repository it points at (unlike RPM/Ansible, where deleting
          // a distribution never touches the repository) - since this tab
          // only ever lists this repository's own distributions, that's
          // always the consequence here, not a conditional one.
          warning={`Deleting this distribution also deletes "${repository.name}" itself, including all its synced content.`}
          isDeleting={deleteMutation.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() =>
            deleteMutation.mutate(
              { href: pendingDelete.pulp_href, name: pendingDelete.name },
              {
                // The parent repository is gone too (see the warning above)
                // - navigate back to the list rather than leaving the user
                // on a now-nonexistent repository's page.
                onSuccess: () => navigate("/containers/repositories"),
              },
            )
          }
        />
      ) : null}
    </>
  );
}
