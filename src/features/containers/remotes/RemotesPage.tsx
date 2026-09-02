import { useState } from "react";
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
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import type { ContainerRemote } from "../../../api/client/container/types";
import { useContainerRemotesQuery } from "./useContainerRemotesQuery";
import { useDeleteContainerRemoteMutation } from "./useDeleteContainerRemoteMutation";
import { CreateRemoteModal } from "./CreateRemoteModal";
import { EditRemoteModal } from "./EditRemoteModal";

export function RemotesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRemote, setEditingRemote] = useState<ContainerRemote | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContainerRemote | null>(null);
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteContainerRemoteMutation();

  const remotesQuery = useContainerRemotesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  });

  return (
    <>
      <PageHeader
        title="Container remotes"
        description="External container registries Pulp can sync repositories from."
        actions={<Button onClick={() => setIsCreateOpen(true)}>Create remote</Button>}
      />
      <PageSection hasBodyWrapper={false}>
        <Toolbar>
          <ToolbarContent>
            {/* Fixed width - without it, the bar grows/shrinks as the clear
                ("x") button appears/disappears with typed text (VERIFIED:
                SearchInput has no intrinsic width of its own). */}
            <ToolbarItem style={{ width: "18rem" }}>
              <SearchInput
                aria-label="Search remotes by name"
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
                itemCount={remotesQuery.data?.count ?? 0}
                page={pagination.page}
                perPage={pagination.perPage}
                onSetPage={pagination.onSetPage}
                onPerPageSelect={pagination.onPerPageSelect}
                isCompact
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {remotesQuery.isPending ? <LoadingState label="Loading remotes" /> : null}
        {remotesQuery.isError ? (
          <ErrorState error={remotesQuery.error} onRetry={() => remotesQuery.refetch()} />
        ) : null}
        {remotesQuery.isSuccess && remotesQuery.data.results.length === 0 ? (
          <EmptyState
            title="No container remotes yet"
            body="Create a remote to point at an external registry you want to sync from."
            action={<Button onClick={() => setIsCreateOpen(true)}>Create remote</Button>}
          />
        ) : null}
        {remotesQuery.isSuccess && remotesQuery.data.results.length > 0 ? (
          <Table aria-label="Container remotes" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>URL</Th>
                <Th>Upstream name</Th>
                <Th>Policy</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {remotesQuery.data.results.map((remote) => (
                <Tr key={remote.pulp_href}>
                  <Td dataLabel="Name">{remote.name}</Td>
                  <Td dataLabel="URL">{remote.url}</Td>
                  <Td dataLabel="Upstream name">{remote.upstream_name}</Td>
                  <Td dataLabel="Policy">{remote.policy}</Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Flex
                      flexWrap={{ default: "nowrap" }}
                      spaceItems={{ default: "spaceItemsNone" }}
                      justifyContent={{ default: "justifyContentFlexEnd" }}
                    >
                      <FlexItem>
                        <Button variant="link" onClick={() => setEditingRemote(remote)}>
                          Edit
                        </Button>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          variant="link"
                          isDanger
                          onClick={() => setPendingDelete(remote)}
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
        ) : null}
      </PageSection>

      {isCreateOpen ? <CreateRemoteModal onClose={() => setIsCreateOpen(false)} /> : null}
      {editingRemote ? (
        <EditRemoteModal remote={editingRemote} onClose={() => setEditingRemote(null)} />
      ) : null}
      {pendingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="remote"
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
