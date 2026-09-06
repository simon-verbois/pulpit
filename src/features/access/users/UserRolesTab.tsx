import { useState } from "react";
import {
  Button,
  Label,
  Pagination,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import type { User } from "../../../api/client/access/types";
import { useUserRolesQuery } from "./useUserRolesQuery";
import {
  useAssignUserRoleMutation,
  useUnassignUserRoleMutation,
} from "./useAssignUserRoleMutation";
import { AssignRoleModal } from "../AssignRoleModal";

export function UserRolesTab({ user }: { user: User }) {
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const pagination = usePulpPagination();
  const assignMutation = useAssignUserRoleMutation();
  const unassignMutation = useUnassignUserRoleMutation();

  const rolesQuery = useUserRolesQuery(user.pulp_href, {
    limit: pagination.limit,
    offset: pagination.offset,
  });

  return (
    <>
      {rolesQuery.isPending ? <LoadingState label="Loading role assignments" /> : null}
      {rolesQuery.isError ? (
        <ErrorState error={rolesQuery.error} onRetry={() => rolesQuery.refetch()} />
      ) : null}
      {rolesQuery.isSuccess && rolesQuery.data.results.length === 0 ? (
        <EmptyState
          variant="sm"
          title="No roles assigned yet"
          body="Assign a role to grant this user permissions, either globally or scoped to one object."
          action={<Button onClick={() => setIsAssignOpen(true)}>Assign role…</Button>}
        />
      ) : null}
      {rolesQuery.isSuccess && rolesQuery.data.results.length > 0 ? (
        <>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem>
                <Button onClick={() => setIsAssignOpen(true)}>Assign role…</Button>
              </ToolbarItem>
              <ToolbarItem align={{ default: "alignEnd" }}>
                <Pagination
                  itemCount={rolesQuery.data.count}
                  page={pagination.page}
                  perPage={pagination.perPage}
                  onSetPage={pagination.onSetPage}
                  onPerPageSelect={pagination.onPerPageSelect}
                  isCompact
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <Table aria-label="Assigned roles" variant="compact">
            <Thead>
              <Tr>
                <Th>Role</Th>
                <Th>Scope</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {rolesQuery.data.results.map((assignment) => (
                <Tr key={assignment.pulp_href}>
                  <Td dataLabel="Role">{assignment.role}</Td>
                  <Td dataLabel="Scope">
                    {assignment.content_object ? (
                      <code>{assignment.content_object}</code>
                    ) : (
                      <Label isCompact>Global</Label>
                    )}
                  </Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Button
                      variant="link"
                      isDanger
                      onClick={() =>
                        unassignMutation.mutate({
                          userHref: user.pulp_href,
                          roleAssignmentHref: assignment.pulp_href,
                        })
                      }
                    >
                      Remove
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      ) : null}

      {isAssignOpen ? (
        <AssignRoleModal
          subjectKind="user"
          subjectLabel={`"${user.username}"`}
          isPending={assignMutation.isPending}
          error={assignMutation.error}
          onClose={() => setIsAssignOpen(false)}
          onAssign={(data) =>
            assignMutation.mutate(
              { userHref: user.pulp_href, data },
              { onSuccess: () => setIsAssignOpen(false) },
            )
          }
        />
      ) : null}
    </>
  );
}
