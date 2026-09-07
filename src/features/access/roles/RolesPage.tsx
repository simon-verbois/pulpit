import { useMemo, useState } from "react";
import {
  Button,
  Flex,
  FlexItem,
  Label,
  Pagination,
  PageSection,
  SearchInput,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import type { Role } from "../../../api/client/access/types";
import { useAdministrationHeaderAction } from "../../administration/AdministrationHeaderActionContext";
import { useRolesQuery } from "./useRolesQuery";
import { useDeleteRoleMutation } from "./useDeleteRoleMutation";
import { CreateRoleModal } from "./CreateRoleModal";
import { EditRoleModal } from "./EditRoleModal";

type RoleFilter = "all" | "custom" | "built-in";

export function RolesPage() {
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Role | null>(null);
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteRoleMutation();

  const rolesQuery = useRolesQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
    locked: filter === "all" ? undefined : filter === "built-in",
  });

  // Rendered in Administration's shared PageHeader (top right), not here -
  // this page has no PageHeader of its own (docs/adr/
  // 0010-merged-administration-page.md).
  const createButton = useMemo(
    () => <Button onClick={() => setIsCreateOpen(true)}>Create role</Button>,
    [],
  );
  useAdministrationHeaderAction("roles", createButton);

  const isFiltered = search !== "" || filter !== "all";

  const toolbar = (
    <Toolbar>
      <ToolbarContent>
        <ToolbarItem>
          <ToggleGroup aria-label="Role filter">
            <ToggleGroupItem
              text="All"
              isSelected={filter === "all"}
              onChange={() => setFilter("all")}
            />
            <ToggleGroupItem
              text="Built-in"
              isSelected={filter === "built-in"}
              onChange={() => setFilter("built-in")}
            />
            <ToggleGroupItem
              text="Custom"
              isSelected={filter === "custom"}
              onChange={() => setFilter("custom")}
            />
          </ToggleGroup>
        </ToolbarItem>
        {/* Fixed width - without it, the bar grows/shrinks as the clear
            ("x") button appears/disappears with typed text (VERIFIED:
            SearchInput has no intrinsic width of its own). */}
        <ToolbarItem style={{ width: "18rem" }}>
          <SearchInput
            aria-label="Search roles by name"
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
            itemCount={rolesQuery.data?.count ?? 0}
            page={pagination.page}
            perPage={pagination.perPage}
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
        {rolesQuery.isPending ? <LoadingState label="Loading roles" /> : null}
        {rolesQuery.isError ? (
          <ErrorState error={rolesQuery.error} onRetry={() => rolesQuery.refetch()} />
        ) : null}
        {rolesQuery.isSuccess && rolesQuery.data.results.length === 0 && !isFiltered ? (
          <EmptyState
            variant="sm"
            title="No roles found"
            body="Create a role above to grant a specific set of permissions to users or groups."
          />
        ) : null}
        {rolesQuery.isSuccess && rolesQuery.data.results.length === 0 && isFiltered ? (
          <>
            {toolbar}
            <EmptyState
              variant="sm"
              title={filter === "custom" ? "No custom roles yet" : "No matching roles"}
              body="Try a different search or filter."
            />
          </>
        ) : null}
        {rolesQuery.isSuccess && rolesQuery.data.results.length > 0 ? (
          <>
            {toolbar}
            <Table aria-label="Roles" variant="compact">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th>Permissions</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {rolesQuery.data.results.map((role) => (
                  <Tr key={role.pulp_href}>
                    <Td dataLabel="Name">
                      <code>{role.name}</code>{" "}
                      {role.locked ? <Label isCompact>Built-in</Label> : null}
                    </Td>
                    <Td dataLabel="Description">{role.description ?? "—"}</Td>
                    <Td dataLabel="Permissions">{role.permissions.length}</Td>
                    <Td dataLabel="Actions" isActionCell>
                      {role.locked ? null : (
                        <Flex
                          flexWrap={{ default: "nowrap" }}
                          spaceItems={{ default: "spaceItemsNone" }}
                          justifyContent={{ default: "justifyContentFlexEnd" }}
                        >
                          <FlexItem>
                            <Button variant="link" onClick={() => setEditingRole(role)}>
                              Edit
                            </Button>
                          </FlexItem>
                          <FlexItem>
                            <Button
                              variant="link"
                              isDanger
                              onClick={() => setPendingDelete(role)}
                            >
                              Delete
                            </Button>
                          </FlexItem>
                        </Flex>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </>
        ) : null}
      </PageSection>

      {isCreateOpen ? <CreateRoleModal onClose={() => setIsCreateOpen(false)} /> : null}
      {editingRole ? (
        <EditRoleModal role={editingRole} onClose={() => setEditingRole(null)} />
      ) : null}
      {pendingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="role"
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
