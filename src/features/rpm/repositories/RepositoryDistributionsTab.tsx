import { useState } from "react";
import {
  Button,
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
import { CopyableCodeBlock } from "../../../components/CopyableCodeBlock";
import { TaskActionButton } from "../../../components/TaskActionButton";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { generateRpmConfigRepo } from "../../../api/client/rpm/repoConfig";
import type { RpmDistribution, RpmRepository } from "../../../api/client/rpm/types";
import { useRpmDistributionsQuery } from "../distributions/useRpmDistributionsQuery";
import { useDeleteRpmDistributionMutation } from "../distributions/useDeleteRpmDistributionMutation";
import { useUpdateRpmDistributionMutation } from "../distributions/useUpdateRpmDistributionMutation";
import { CreateDistributionModal } from "../distributions/CreateDistributionModal";

/** The "Repo config" column - a cleaner, at-a-glance view of what used to
 * require reading `RpmDistribution.generate_repo_config`/
 * `RpmRepository.repo_config` directly. When generation is off, this is
 * just a one-click way to turn it on (VERIFIED live: the flag itself takes
 * effect immediately, no republish needed - see repoConfig.ts). When it's
 * on, this shows a `dnf`/`yum`-ready `config.repo` preview built entirely
 * from data already loaded client-side (see `generateRpmConfigRepo`'s own
 * doc comment for why this no longer fetches Pulp's own generated file). */
function RepoConfigCell({
  distribution,
  repository,
}: {
  distribution: RpmDistribution;
  repository: RpmRepository;
}) {
  const updateDistributionMutation = useUpdateRpmDistributionMutation();

  if (!distribution.generate_repo_config) {
    return (
      <Button
        variant="link"
        isInline
        isLoading={updateDistributionMutation.isPending}
        onClick={() =>
          updateDistributionMutation.mutate({
            href: distribution.pulp_href,
            name: distribution.name,
            data: { generate_repo_config: true },
          })
        }
      >
        Enable
      </Button>
    );
  }

  return (
    <CopyableCodeBlock
      code={generateRpmConfigRepo(distribution, repository)}
      copyLabel={`Copy ${distribution.name} repository configuration`}
      previewLines={3}
    />
  );
}

export function RepositoryDistributionsTab({
  repository,
}: {
  repository: RpmRepository;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RpmDistribution | null>(null);
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteRpmDistributionMutation();

  const distributionsQuery = useRpmDistributionsQuery({
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
          <Table aria-label="Distributions" variant="compact" gridBreakPoint="grid-lg">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Repo config</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {distributionsQuery.data.results.map((distribution) => (
                <Tr key={distribution.pulp_href}>
                  <Td dataLabel="Name">{distribution.name}</Td>
                  <Td dataLabel="Repo config">
                    <RepoConfigCell distribution={distribution} repository={repository} />
                  </Td>
                  <Td dataLabel="Actions" isActionCell hasAction>
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
          repository={repository}
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
