import { useState } from "react";
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
import type { GemDistribution, GemRepository } from "../../../api/client/gem/types";
import { useGemDistributionsQuery } from "../distributions/useGemDistributionsQuery";
import { useDeleteGemDistributionMutation } from "../distributions/useDeleteGemDistributionMutation";
import { CreateDistributionModal } from "../distributions/CreateDistributionModal";

export function RepositoryDistributionsTab({
  repository,
}: {
  repository: GemRepository;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<GemDistribution | null>(null);
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteGemDistributionMutation();

  const distributionsQuery = useGemDistributionsQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    repository: repository.pulp_href,
  });

  return (
    <>
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
          variant="sm"
          title="No distributions yet"
          body="Create a distribution to publish this repository's content at a URL."
          action={
            <Button onClick={() => setIsCreateOpen(true)}>Create distribution</Button>
          }
        />
      ) : null}
      {distributionsQuery.isSuccess && distributionsQuery.data.results.length > 0 ? (
        <>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem>
                <Button onClick={() => setIsCreateOpen(true)}>Create distribution</Button>
              </ToolbarItem>
              <ToolbarItem align={{ default: "alignEnd" }}>
                <Pagination
                  itemCount={distributionsQuery.data.count}
                  page={pagination.page}
                  perPage={pagination.perPage}
                  onSetPage={pagination.onSetPage}
                  onPerPageSelect={pagination.onPerPageSelect}
                  isCompact
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <Table aria-label="Distributions" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Base path</Th>
                <Th>URL</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {distributionsQuery.data.results.map((distribution) => (
                <Tr key={distribution.pulp_href}>
                  <Td dataLabel="Name">{distribution.name}</Td>
                  <Td dataLabel="Base path">{distribution.base_path}</Td>
                  <Td dataLabel="URL">
                    <ClipboardCopy isReadOnly hoverTip="Copy" clickTip="Copied">
                      {distribution.base_url}
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
