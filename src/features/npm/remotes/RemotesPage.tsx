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
import { TaskActionButton } from "../../../components/TaskActionButton";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import type { NpmRemote } from "../../../api/client/npm/types";
import { useNpmRemotesQuery } from "./useNpmRemotesQuery";
import { useDeleteNpmRemoteMutation } from "./useDeleteNpmRemoteMutation";
import { CreateRemoteModal } from "./CreateRemoteModal";
import { EditRemoteModal } from "./EditRemoteModal";

/** Only one remote "flavor" for this plugin (VERIFIED live: unlike RPM's
 * Standard/ULN or File's Standard/Git, there's a single
 * `/remotes/npm/npm/` collection) - no toggle needed. A remote here can be
 * used two ways: as a repository's default sync source (see the
 * Repositories page), or attached directly to a distribution for
 * pull-through caching (see a repository's Distributions tab). */
export function RemotesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRemote, setEditingRemote] = useState<NpmRemote | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NpmRemote | null>(null);
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteNpmRemoteMutation();

  const remotesQuery = useNpmRemotesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  });

  return (
    <>
      <PageHeader
        title="NPM remotes"
        description="NPM registries Pulp can sync repositories from, or proxy directly."
        actions={<Button onClick={() => setIsCreateOpen(true)}>Create remote</Button>}
      />
      <PageSection hasBodyWrapper={false}>
        {remotesQuery.isPending ? <LoadingState label="Loading remotes" /> : null}
        {remotesQuery.isError ? (
          <ErrorState error={remotesQuery.error} onRetry={() => remotesQuery.refetch()} />
        ) : null}
        {remotesQuery.isSuccess && remotesQuery.data.results.length === 0 ? (
          <EmptyState
            title="No NPM remotes yet"
            body="Create a remote to point at an NPM registry such as registry.npmjs.org."
            action={<Button onClick={() => setIsCreateOpen(true)}>Create remote</Button>}
          />
        ) : null}
        {remotesQuery.isSuccess && remotesQuery.data.results.length > 0 ? (
          <>
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
            <Table aria-label="NPM remotes" variant="compact">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>URL</Th>
                  <Th>Policy</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {remotesQuery.data.results.map((remote) => (
                  <Tr key={remote.pulp_href}>
                    <Td dataLabel="Name">{remote.name}</Td>
                    <Td dataLabel="URL">{remote.url}</Td>
                    <Td dataLabel="Policy">{remote.policy}</Td>
                    <Td dataLabel="Actions" isActionCell>
                      <Flex
                        flexWrap={{ default: "nowrap" }}
                        spaceItems={{ default: "spaceItemsNone" }}
                        justifyContent={{ default: "justifyContentFlexEnd" }}
                      >
                        <FlexItem>
                          <TaskActionButton
                            resourceHref={remote.pulp_href}
                            taskAction="edit"
                            variant="link"
                            onClick={() => setEditingRemote(remote)}
                          >
                            Edit
                          </TaskActionButton>
                        </FlexItem>
                        <FlexItem>
                          <TaskActionButton
                            resourceHref={remote.pulp_href}
                            taskAction="delete"
                            variant="link"
                            isDanger
                            onClick={() => setPendingDelete(remote)}
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
