import { useMemo, useState } from "react";
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

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { StatusIndicator } from "../../../components/StatusIndicator";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import type { User } from "../../../api/client/access/types";
import { useAdministrationHeaderAction } from "../../administration/AdministrationHeaderActionContext";
import { useUsersQuery } from "./useUsersQuery";
import { useDeleteUserMutation } from "./useDeleteUserMutation";
import { CreateUserModal } from "./CreateUserModal";

export function UsersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteUserMutation();

  const usersQuery = useUsersQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    username__icontains: search || undefined,
  });

  // Rendered in Administration's shared PageHeader (top right), not here -
  // this page has no PageHeader of its own (docs/adr/
  // 0010-merged-administration-page.md).
  const createButton = useMemo(
    () => <Button onClick={() => setIsCreateOpen(true)}>Create user</Button>,
    [],
  );
  useAdministrationHeaderAction("users", createButton);

  const isFiltered = search !== "";

  const toolbar = (
    <Toolbar>
      <ToolbarContent>
        {/* Fixed width - without it, the bar grows/shrinks as the clear
            ("x") button appears/disappears with typed text (VERIFIED:
            SearchInput has no intrinsic width of its own). */}
        <ToolbarItem style={{ width: "18rem" }}>
          <SearchInput
            aria-label="Search users by username"
            placeholder="Search by username…"
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
            itemCount={usersQuery.data?.count ?? 0}
            page={pagination.page}
            perPage={pagination.perPage}
            perPageOptions={pagination.perPageOptions}
            onSetPage={pagination.onSetPage}
            onPerPageSelect={pagination.onPerPageSelect}
            isCompact
          />
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        {usersQuery.isPending ? <LoadingState label="Loading users" /> : null}
        {usersQuery.isError ? (
          <ErrorState error={usersQuery.error} onRetry={() => usersQuery.refetch()} />
        ) : null}
        {usersQuery.isSuccess && usersQuery.data.results.length === 0 && !isFiltered ? (
          <EmptyState
            variant="sm"
            title="No users yet"
            body="Create a Pulp account above so someone else can log in."
          />
        ) : null}
        {usersQuery.isSuccess && usersQuery.data.results.length === 0 && isFiltered ? (
          <>
            {toolbar}
            <EmptyState
              variant="sm"
              title="No matching users"
              body="Try a different search, or clear it to see every user."
            />
          </>
        ) : null}
        {usersQuery.isSuccess && usersQuery.data.results.length > 0 ? (
          <>
            {toolbar}
            <Table aria-label="Users" variant="compact">
              <Thead>
                <Tr>
                  <Th>Username</Th>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {usersQuery.data.results.map((user) => (
                  <Tr key={user.pulp_href}>
                    <Td dataLabel="Username">
                      <Link to={`/access/users/${encodeURIComponent(user.username)}`}>
                        {user.username}
                      </Link>
                    </Td>
                    <Td dataLabel="Name">
                      {[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}
                    </Td>
                    <Td dataLabel="Email">{user.email || "—"}</Td>
                    <Td dataLabel="Status">
                      <Flex spaceItems={{ default: "spaceItemsSm" }}>
                        <FlexItem>
                          {user.is_active ? (
                            <StatusIndicator color="green" isCompact>
                              Active
                            </StatusIndicator>
                          ) : (
                            <StatusIndicator color="grey" isCompact>
                              Inactive
                            </StatusIndicator>
                          )}
                        </FlexItem>
                        {user.is_staff ? (
                          <FlexItem>
                            <StatusIndicator color="blue" isCompact>
                              Staff
                            </StatusIndicator>
                          </FlexItem>
                        ) : null}
                      </Flex>
                    </Td>
                    <Td dataLabel="Actions" isActionCell>
                      <Button
                        variant="link"
                        isDanger
                        onClick={() => setPendingDelete(user)}
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

      {isCreateOpen ? <CreateUserModal onClose={() => setIsCreateOpen(false)} /> : null}
      {pendingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="user"
          itemLabel={pendingDelete.username}
          isDeleting={deleteMutation.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() =>
            deleteMutation.mutate(
              { href: pendingDelete.pulp_href, username: pendingDelete.username },
              { onSuccess: () => setPendingDelete(null) },
            )
          }
        />
      ) : null}
    </>
  );
}
