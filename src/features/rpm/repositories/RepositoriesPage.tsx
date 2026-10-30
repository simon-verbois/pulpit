import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Flex, FlexItem, SearchInput } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { ListToolbar } from "../../../components/ListToolbar";
import { PageLayout } from "../../../components/PageLayout";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { RepositorySizeCell } from "../../../components/RepositorySizeCell";
import { RepositoryRowActions } from "../../../components/RepositoryRowActions";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useRepositoryContentSizesQuery } from "../../../hooks/useRepositoryContentSizesQuery";
import type { RpmRepository } from "../../../api/client/rpm/types";
import { useRpmRepositoriesQuery } from "./useRpmRepositoriesQuery";
import { useDeleteRpmRepositoryMutation } from "./useDeleteRpmRepositoryMutation";
import { useSyncRpmRepositoryMutation } from "./useSyncRpmRepositoryMutation";
import { usePublishRpmRepositoryMutation } from "./usePublishRpmRepositoryMutation";
import {
  rpmRepositoryByNameKey,
  rpmRepositoriesListRootKey,
  rpmRepositoryVersionsKey,
} from "./queryKeys";
import { CreateRepositoryModal } from "./CreateRepositoryModal";
import { EditRepositoryModal } from "./EditRepositoryModal";
import { PrunePackagesModal } from "./PrunePackagesModal";

export function RepositoriesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPruneOpen, setIsPruneOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RpmRepository | null>(null);
  const [pendingEdit, setPendingEdit] = useState<RpmRepository | null>(null);
  const pagination = usePulpPagination(undefined, search);
  const sizesQuery = useRepositoryContentSizesQuery();
  const deleteMutation = useDeleteRpmRepositoryMutation();
  const syncMutation = useSyncRpmRepositoryMutation();
  const publishMutation = usePublishRpmRepositoryMutation();

  const repositoriesQuery = useRpmRepositoriesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  });

  return (
    <>
      <PageLayout
        title="RPM repositories"
        description="Repositories holding RPM package content, versioned on every change."
        actions={
          <Flex spaceItems={{ default: "spaceItemsSm" }}>
            <FlexItem>
              <Button variant="secondary" onClick={() => setIsPruneOpen(true)}>
                Prune packages…
              </Button>
            </FlexItem>
            <FlexItem>
              <Button onClick={() => setIsCreateOpen(true)}>Create repository</Button>
            </FlexItem>
          </Flex>
        }
      >
        {repositoriesQuery.isPending ? (
          <LoadingState
            columns={["Name", "Description", "Size", "Actions"]}
            label="Loading repositories"
          />
        ) : null}
        {repositoriesQuery.isError ? (
          <ErrorState
            error={repositoriesQuery.error}
            onRetry={() => repositoriesQuery.refetch()}
          />
        ) : null}
        {repositoriesQuery.isSuccess &&
        repositoriesQuery.data.results.length === 0 &&
        pagination.page === 1 ? (
          <EmptyState
            title="No RPM repositories yet"
            body="Create a repository to start syncing or uploading RPM content."
            action={
              <Button onClick={() => setIsCreateOpen(true)}>Create repository</Button>
            }
          />
        ) : null}
        {repositoriesQuery.isSuccess &&
        (repositoriesQuery.data.results.length > 0 || pagination.page > 1) ? (
          <>
            <ListToolbar
              search={
                <SearchInput
                  aria-label="Search repositories by name"
                  placeholder="Search by name…"
                  value={searchInput}
                  onChange={(_event, value) => setSearchInput(value)}
                  onSearch={() => setSearch(searchInput)}
                  onClear={() => {
                    setSearchInput("");
                    setSearch("");
                  }}
                />
              }
              pagination={pagination}
              itemCount={repositoriesQuery.data?.count ?? 0}
            />
            <Table aria-label="RPM repositories" variant="compact">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th>Size</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {repositoriesQuery.data.results.map((repository) => (
                  <Tr key={repository.pulp_href}>
                    <Td dataLabel="Name">
                      <Link
                        to={`/rpm/repositories/${encodeURIComponent(repository.name)}`}
                      >
                        {repository.name}
                      </Link>
                    </Td>
                    <Td dataLabel="Description">{repository.description ?? "—"}</Td>
                    <Td dataLabel="Size">
                      <RepositorySizeCell
                        query={sizesQuery}
                        repositoryHref={repository.pulp_href}
                      />
                    </Td>
                    <Td dataLabel="Actions" isActionCell>
                      <RepositoryRowActions
                        repositoryName={repository.name}
                        resourceHref={repository.pulp_href}
                        sync={{
                          isDisabled: !repository.remote || syncMutation.isPending,
                          title: repository.remote
                            ? undefined
                            : "Edit this repository to set a default remote before syncing",
                          onClick: () =>
                            syncMutation.mutate({
                              href: repository.pulp_href,
                              name: repository.name,
                              invalidateKeys: [
                                rpmRepositoryByNameKey(repository.name),
                                rpmRepositoriesListRootKey,
                                rpmRepositoryVersionsKey(repository.versions_href),
                              ],
                            }),
                        }}
                        publish={{
                          isDisabled: publishMutation.isPending,
                          title: repository.autopublish
                            ? "Autopublish is on for this repository - only needed to force a republish"
                            : undefined,
                          onClick: () =>
                            publishMutation.mutate({
                              href: repository.pulp_href,
                              name: repository.name,
                            }),
                        }}
                        onEdit={() => setPendingEdit(repository)}
                        onDelete={() => setPendingDelete(repository)}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </>
        ) : null}
      </PageLayout>

      {isCreateOpen ? (
        <CreateRepositoryModal onClose={() => setIsCreateOpen(false)} />
      ) : null}
      {isPruneOpen ? <PrunePackagesModal onClose={() => setIsPruneOpen(false)} /> : null}
      {pendingEdit ? (
        <EditRepositoryModal
          repository={pendingEdit}
          onClose={() => setPendingEdit(null)}
          navigateOnRename={false}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="repository"
          warning="Distributions are kept. If you recreate this repository, you can reconnect its unused distributions."
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
