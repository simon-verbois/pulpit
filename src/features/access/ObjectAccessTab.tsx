import { useState } from "react";
import { Button, Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { useObjectRolesQuery } from "./useObjectRolesQuery";
import {
  useAddObjectRoleMutation,
  useRemoveObjectRoleMutation,
} from "./useObjectRoleMutations";
import { GrantObjectAccessModal } from "./GrantObjectAccessModal";

interface AccessRow {
  role: string;
  subject: string;
  kind: "user" | "group";
}

/**
 * Shared "Access" tab for any RBAC-protected object (see
 * src/api/client/access/objectRoles.ts) - added to Repository detail pages
 * across RPM/Ansible/Container (Milestone 5 "object-level permissions").
 * Flattens the API's per-role `{role, users: [...], groups: [...]}` shape
 * into one row per (role, subject) pair so a single user/group can be
 * revoked from a role without touching everyone else who has it.
 */
export function ObjectAccessTab({
  objectHref,
  objectLabel,
}: {
  objectHref: string;
  objectLabel: string;
}) {
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const rolesQuery = useObjectRolesQuery(objectHref);
  const addMutation = useAddObjectRoleMutation();
  const removeMutation = useRemoveObjectRoleMutation();

  const rows: AccessRow[] = (rolesQuery.data?.roles ?? []).flatMap((assignment) => [
    ...assignment.users.map((subject) => ({
      role: assignment.role,
      subject,
      kind: "user" as const,
    })),
    ...assignment.groups.map((subject) => ({
      role: assignment.role,
      subject,
      kind: "group" as const,
    })),
  ]);

  const handleRemove = (row: AccessRow) => {
    removeMutation.mutate({
      objectHref,
      data: {
        role: row.role,
        users: row.kind === "user" ? [row.subject] : [],
        groups: row.kind === "group" ? [row.subject] : [],
      },
    });
  };

  return (
    <>
      {rolesQuery.isPending ? <LoadingState label="Loading access" /> : null}
      {rolesQuery.isError ? (
        <ErrorState error={rolesQuery.error} onRetry={() => rolesQuery.refetch()} />
      ) : null}
      {rolesQuery.isSuccess && rows.length === 0 ? (
        <EmptyState
          variant="sm"
          title="No one has explicit access yet"
          body="Grant a role to a user or group so they can act on this object specifically."
          action={<Button onClick={() => setIsGrantOpen(true)}>Grant access…</Button>}
        />
      ) : null}
      {rolesQuery.isSuccess && rows.length > 0 ? (
        <>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem>
                <Button onClick={() => setIsGrantOpen(true)}>Grant access…</Button>
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <Table aria-label="Access" variant="compact">
            <Thead>
              <Tr>
                <Th>Role</Th>
                <Th>Granted to</Th>
                <Th>Type</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row) => (
                <Tr key={`${row.role}-${row.kind}-${row.subject}`}>
                  <Td dataLabel="Role">
                    <code>{row.role}</code>
                  </Td>
                  <Td dataLabel="Granted to">{row.subject}</Td>
                  <Td dataLabel="Type">{row.kind === "user" ? "User" : "Group"}</Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Button variant="link" isDanger onClick={() => handleRemove(row)}>
                      Remove
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      ) : null}

      {isGrantOpen ? (
        <GrantObjectAccessModal
          objectLabel={objectLabel}
          isPending={addMutation.isPending}
          error={addMutation.error}
          onClose={() => setIsGrantOpen(false)}
          onGrant={(data) =>
            addMutation.mutate(
              { objectHref, data },
              { onSuccess: () => setIsGrantOpen(false) },
            )
          }
        />
      ) : null}
    </>
  );
}
