import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
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
import { TaskActionButton } from "../../../components/TaskActionButton";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useRepositoryContentSizesQuery } from "../../../hooks/useRepositoryContentSizesQuery";
import type { MavenRepository } from "../../../api/client/maven/types";
import { useMavenRepositoriesQuery } from "./useMavenRepositoriesQuery";
import { useDeleteMavenRepositoryMutation } from "./useDeleteMavenRepositoryMutation";
import { CreateRepositoryModal } from "./CreateRepositoryModal";

/** No Sync/Publish row actions here - VERIFIED live: this plugin has
 * neither a repository `sync/` endpoint nor a publication endpoint at all;
 * content only gets in via direct upload (see the repository's Content
 * tab), and a distribution serves a repository's latest version directly. */
export function RepositoriesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MavenRepository | null>(null);
  const pagination = usePulpPagination();
  const sizesQuery = useRepositoryContentSizesQuery();
  const deleteMutation = useDeleteMavenRepositoryMutation();

  const repositoriesQuery = useMavenRepositoriesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  });

  return (
    <>
      <PageHeader
        title="Maven repositories"
        description="Repositories holding Maven artifacts, versioned on every change."
        actions={<Button onClick={() => setIsCreateOpen(true)}>Create repository</Button>}
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
            title="No Maven repositories yet"
            body="Create a repository, then upload artifacts to it from its Content tab."
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
            <Table aria-label="Maven repositories" variant="compact">
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
                        to={`/maven/repositories/${encodeURIComponent(repository.name)}`}
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
                      <TaskActionButton
                        resourceHref={repository.pulp_href}
                        taskAction="delete"
                        variant="link"
                        isDanger
                        onClick={() => setPendingDelete(repository)}
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
      </PageSection>

      {isCreateOpen ? (
        <CreateRepositoryModal onClose={() => setIsCreateOpen(false)} />
      ) : null}
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
