import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Flex,
  FlexItem,
  Pagination,
  PageSection,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { PageHeader } from "../../../components/PageHeader";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { RepositorySizeCell } from "../../../components/RepositorySizeCell";
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
import { PrunePackagesModal } from "./PrunePackagesModal";

export function RepositoriesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPruneOpen, setIsPruneOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RpmRepository | null>(null);
  const pagination = usePulpPagination();
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
      <PageHeader
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
      />
      <PageSection hasBodyWrapper={false}>
        {repositoriesQuery.isPending ? (
          <LoadingState label="Loading repositories" />
        ) : null}
        {repositoriesQuery.isError ? (
          <ErrorState
            error={repositoriesQuery.error}
            onRetry={() => repositoriesQuery.refetch()}
          />
        ) : null}
        {repositoriesQuery.isSuccess && repositoriesQuery.data.results.length === 0 ? (
          <EmptyState
            title="No RPM repositories yet"
            body="Create a repository to start syncing or uploading RPM content."
            action={
              <Button onClick={() => setIsCreateOpen(true)}>Create repository</Button>
            }
          />
        ) : null}
        {repositoriesQuery.isSuccess && repositoriesQuery.data.results.length > 0 ? (
          <>
            <Toolbar>
              <ToolbarContent>
                {/* Fixed width - without it, the bar grows/shrinks as the clear
                    ("x") button appears/disappears with typed text (VERIFIED:
                    SearchInput has no intrinsic width of its own). */}
                <ToolbarItem style={{ width: "18rem" }}>
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
                </ToolbarItem>
                <ToolbarItem align={{ default: "alignEnd" }}>
                  <Pagination
                    itemCount={repositoriesQuery.data?.count ?? 0}
                    page={pagination.page}
                    perPage={pagination.perPage}
                    onSetPage={pagination.onSetPage}
                    onPerPageSelect={pagination.onPerPageSelect}
                    isCompact
                  />
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
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
                      <Flex
                        flexWrap={{ default: "nowrap" }}
                        spaceItems={{ default: "spaceItemsNone" }}
                        justifyContent={{ default: "justifyContentFlexEnd" }}
                      >
                        <FlexItem>
                          <Button
                            variant="link"
                            isDisabled={!repository.remote || syncMutation.isPending}
                            title={
                              repository.remote
                                ? undefined
                                : "Edit this repository to set a default remote before syncing"
                            }
                            onClick={() =>
                              syncMutation.mutate({
                                href: repository.pulp_href,
                                name: repository.name,
                                invalidateKeys: [
                                  rpmRepositoryByNameKey(repository.name),
                                  rpmRepositoriesListRootKey,
                                  rpmRepositoryVersionsKey(repository.versions_href),
                                ],
                              })
                            }
                          >
                            Sync
                          </Button>
                        </FlexItem>
                        <FlexItem>
                          <Button
                            variant="link"
                            isDisabled={publishMutation.isPending}
                            title={
                              repository.autopublish
                                ? "Autopublish is on for this repository - only needed to force a republish"
                                : undefined
                            }
                            onClick={() =>
                              publishMutation.mutate({
                                href: repository.pulp_href,
                                name: repository.name,
                              })
                            }
                          >
                            Publish
                          </Button>
                        </FlexItem>
                        <FlexItem>
                          <Button
                            variant="link"
                            isDanger
                            onClick={() => setPendingDelete(repository)}
                          >
                            Delete
                          </Button>
                        </FlexItem>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </>
        ) : null}
      </PageSection>

      {isCreateOpen ? (
        <CreateRepositoryModal onClose={() => setIsCreateOpen(false)} />
      ) : null}
      {isPruneOpen ? <PrunePackagesModal onClose={() => setIsPruneOpen(false)} /> : null}
      {pendingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="repository"
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
