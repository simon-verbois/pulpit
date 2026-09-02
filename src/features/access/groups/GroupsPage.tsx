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
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import type { Group } from "../../../api/client/access/types";
import { useGroupsQuery } from "./useGroupsQuery";
import { useDeleteGroupMutation } from "./useDeleteGroupMutation";
import { CreateGroupModal } from "./CreateGroupModal";

export function GroupsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Group | null>(null);
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteGroupMutation();

  const groupsQuery = useGroupsQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  });

  return (
    <>
      <PageHeader
        title="Groups"
        description="Collections of users that can be granted roles together."
        actions={<Button onClick={() => setIsCreateOpen(true)}>Create group</Button>}
      />
      <PageSection hasBodyWrapper={false}>
        <Toolbar>
          <ToolbarContent>
            {/* Fixed width - without it, the bar grows/shrinks as the clear
                ("x") button appears/disappears with typed text (VERIFIED:
                SearchInput has no intrinsic width of its own). */}
            <ToolbarItem style={{ width: "18rem" }}>
              <SearchInput
                aria-label="Search groups by name"
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
                itemCount={groupsQuery.data?.count ?? 0}
                page={pagination.page}
                perPage={pagination.perPage}
                onSetPage={pagination.onSetPage}
                onPerPageSelect={pagination.onPerPageSelect}
                isCompact
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {groupsQuery.isPending ? <LoadingState label="Loading groups" /> : null}
        {groupsQuery.isError ? (
          <ErrorState error={groupsQuery.error} onRetry={() => groupsQuery.refetch()} />
        ) : null}
        {groupsQuery.isSuccess && groupsQuery.data.results.length === 0 ? (
          <EmptyState
            title="No groups yet"
            body="Create a group to manage roles for several users at once."
            action={<Button onClick={() => setIsCreateOpen(true)}>Create group</Button>}
          />
        ) : null}
        {groupsQuery.isSuccess && groupsQuery.data.results.length > 0 ? (
          <Table aria-label="Groups" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {groupsQuery.data.results.map((group) => (
                <Tr key={group.pulp_href}>
                  <Td dataLabel="Name">
                    <Link to={`/access/groups/${encodeURIComponent(group.name)}`}>
                      {group.name}
                    </Link>
                  </Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Button
                      variant="link"
                      isDanger
                      onClick={() => setPendingDelete(group)}
                    >
                      Delete
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : null}
      </PageSection>

      {isCreateOpen ? <CreateGroupModal onClose={() => setIsCreateOpen(false)} /> : null}
      {pendingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="group"
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
