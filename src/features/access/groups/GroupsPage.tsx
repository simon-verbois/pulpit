import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, PageSection, SearchInput } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { ListToolbar } from "../../../components/ListToolbar";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import type { Group } from "../../../api/client/access/types";
import { useAdministrationHeaderAction } from "../../administration/AdministrationHeaderActionContext";
import { useGroupsQuery } from "./useGroupsQuery";
import { useDeleteGroupMutation } from "./useDeleteGroupMutation";
import { CreateGroupModal } from "./CreateGroupModal";

export function GroupsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Group | null>(null);
  const pagination = usePulpPagination(undefined, search);
  const deleteMutation = useDeleteGroupMutation();

  const groupsQuery = useGroupsQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  });

  // Rendered in Administration's shared PageHeader (top right), not here -
  // this page has no PageHeader of its own (docs/adr/
  // 0010-merged-administration-page.md).
  const createButton = useMemo(
    () => <Button onClick={() => setIsCreateOpen(true)}>Create group</Button>,
    [],
  );
  useAdministrationHeaderAction("groups", createButton);

  const isFiltered = search !== "";

  const toolbar = (
    <ListToolbar
      search={
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
      }
      pagination={pagination}
      itemCount={groupsQuery.data?.count ?? 0}
    />
  );

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        {groupsQuery.isPending ? (
          <LoadingState columns={["Name", "Actions"]} label="Loading groups" />
        ) : null}
        {groupsQuery.isError ? (
          <ErrorState error={groupsQuery.error} onRetry={() => groupsQuery.refetch()} />
        ) : null}
        {groupsQuery.isSuccess &&
        groupsQuery.data.results.length === 0 &&
        pagination.page === 1 &&
        !isFiltered ? (
          <EmptyState
            variant="sm"
            title="No groups yet"
            body="Create a group above to manage roles for several users at once."
          />
        ) : null}
        {groupsQuery.isSuccess &&
        groupsQuery.data.results.length === 0 &&
        pagination.page === 1 &&
        isFiltered ? (
          <>
            {toolbar}
            <EmptyState
              variant="sm"
              title="No matching groups"
              body="Try a different search, or clear it to see every group."
            />
          </>
        ) : null}
        {groupsQuery.isSuccess &&
        (groupsQuery.data.results.length > 0 || pagination.page > 1) ? (
          <>
            {toolbar}
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
          </>
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
