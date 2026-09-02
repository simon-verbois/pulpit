import { useState } from "react";
import {
  Button,
  ClipboardCopy,
  ClipboardCopyVariant,
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
  AnsibleDistribution,
  AnsibleRepository,
} from "../../../api/client/ansible/types";
import { useAnsibleDistributionsQuery } from "../distributions/useAnsibleDistributionsQuery";
import { useDeleteAnsibleDistributionMutation } from "../distributions/useDeleteAnsibleDistributionMutation";
import { CreateDistributionModal } from "../distributions/CreateDistributionModal";

/** The ansible.cfg snippet an `ansible-galaxy`/Automation Hub client needs
 * to pull content from this distribution - built from the distribution's
 * own `client_url` (VERIFIED live schema field), the same "copyable client
 * config" idea as RPM's copyable distribution URL, but Ansible's own
 * tooling expects a config block rather than a bare URL. */
function galaxyConfigSnippet(distribution: AnsibleDistribution): string {
  return `[galaxy]\nserver_list = ${distribution.name}\n\n[galaxy_server.${distribution.name}]\nurl=${distribution.client_url}`;
}

export function RepositoryDistributionsTab({
  repository,
}: {
  repository: AnsibleRepository;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AnsibleDistribution | null>(null);
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteAnsibleDistributionMutation();

  const distributionsQuery = useAnsibleDistributionsQuery({
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
          body="Create a distribution so ansible-galaxy/Automation Hub clients can pull this repository's content."
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
              <Th>Client configuration</Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {distributionsQuery.data.results.map((distribution) => (
              <Tr key={distribution.pulp_href}>
                <Td dataLabel="Name">{distribution.name}</Td>
                <Td dataLabel="Base path">{distribution.base_path}</Td>
                <Td dataLabel="Client configuration">
                  <ClipboardCopy
                    isReadOnly
                    isCode
                    variant={ClipboardCopyVariant.expansion}
                    hoverTip="Copy"
                    clickTip="Copied"
                  >
                    {galaxyConfigSnippet(distribution)}
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
