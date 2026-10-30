import { useState } from "react";
import { Button, Flex, FlexItem, SearchInput } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { ListToolbar } from "../../../components/ListToolbar";
import { PageLayout } from "../../../components/PageLayout";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { TaskActionButton } from "../../../components/TaskActionButton";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import type { MavenRemote } from "../../../api/client/maven/types";
import { useMavenRemotesQuery } from "./useMavenRemotesQuery";
import { useDeleteMavenRemoteMutation } from "./useDeleteMavenRemoteMutation";
import { CreateRemoteModal } from "./CreateRemoteModal";
import { EditRemoteModal } from "./EditRemoteModal";

/** Only one remote "flavor" for this plugin (VERIFIED live: unlike RPM's
 * Standard/ULN or File's Standard/Git, there's a single
 * `/remotes/maven/maven/` collection) - no toggle needed. Note that a
 * remote here isn't wired to a repository's sync (pulp_maven's Repository
 * has no `remote` field or sync action at all) - it's used for a
 * distribution's optional pull-through cache instead (see the
 * Distributions tab on a repository's own page). */
export function RemotesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRemote, setEditingRemote] = useState<MavenRemote | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MavenRemote | null>(null);
  const pagination = usePulpPagination(undefined, search);
  const deleteMutation = useDeleteMavenRemoteMutation();

  const remotesQuery = useMavenRemotesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  });

  return (
    <>
      <PageLayout
        title="Maven remotes"
        description="Maven sources a distribution can pull artifacts through, on demand."
        actions={<Button onClick={() => setIsCreateOpen(true)}>Create remote</Button>}
      >
        {remotesQuery.isPending ? (
          <LoadingState
            columns={["Name", "URL", "Policy", "Actions"]}
            label="Loading remotes"
          />
        ) : null}
        {remotesQuery.isError ? (
          <ErrorState error={remotesQuery.error} onRetry={() => remotesQuery.refetch()} />
        ) : null}
        {remotesQuery.isSuccess &&
        remotesQuery.data.results.length === 0 &&
        pagination.page === 1 ? (
          <EmptyState
            title="No Maven remotes yet"
            body="Create a remote to point at a Maven registry such as Maven Central."
            action={<Button onClick={() => setIsCreateOpen(true)}>Create remote</Button>}
          />
        ) : null}
        {remotesQuery.isSuccess &&
        (remotesQuery.data.results.length > 0 || pagination.page > 1) ? (
          <>
            <ListToolbar
              search={
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
              }
              pagination={pagination}
              itemCount={remotesQuery.data?.count ?? 0}
            />
            <Table aria-label="Maven remotes" variant="compact">
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
      </PageLayout>

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
