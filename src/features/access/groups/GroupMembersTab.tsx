import { useState } from "react";
import {
  Button,
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
import { groupUserId } from "../../../api/client/access/groups";
import type { Group } from "../../../api/client/access/types";
import { useGroupUsersQuery } from "./useGroupUsersQuery";
import { useRemoveGroupUserMutation } from "./useGroupMembershipMutations";
import { AddGroupMemberModal } from "./AddGroupMemberModal";

export function GroupMembersTab({ group }: { group: Group }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const pagination = usePulpPagination();
  const removeMutation = useRemoveGroupUserMutation();

  const membersQuery = useGroupUsersQuery(group.pulp_href, {
    limit: pagination.limit,
    offset: pagination.offset,
  });

  return (
    <>
      {membersQuery.isPending ? <LoadingState label="Loading members" /> : null}
      {membersQuery.isError ? (
        <ErrorState error={membersQuery.error} onRetry={() => membersQuery.refetch()} />
      ) : null}
      {membersQuery.isSuccess && membersQuery.data.results.length === 0 ? (
        <EmptyState
          variant="sm"
          title="No members yet"
          body="Add a user to this group so it can be granted roles on their behalf."
          action={<Button onClick={() => setIsAddOpen(true)}>Add member…</Button>}
        />
      ) : null}
      {membersQuery.isSuccess && membersQuery.data.results.length > 0 ? (
        <>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem>
                <Button onClick={() => setIsAddOpen(true)}>Add member…</Button>
              </ToolbarItem>
              <ToolbarItem align={{ default: "alignEnd" }}>
                <Pagination
                  itemCount={membersQuery.data.count}
                  page={pagination.page}
                  perPage={pagination.perPage}
                  onSetPage={pagination.onSetPage}
                  onPerPageSelect={pagination.onPerPageSelect}
                  isCompact
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <Table aria-label="Group members" variant="compact">
            <Thead>
              <Tr>
                <Th>Username</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {membersQuery.data.results.map((member) => (
                <Tr key={member.pulp_href}>
                  <Td dataLabel="Username">{member.username}</Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Button
                      variant="link"
                      isDanger
                      onClick={() =>
                        removeMutation.mutate({
                          groupHref: group.pulp_href,
                          userId: groupUserId(member),
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

      {isAddOpen ? (
        <AddGroupMemberModal
          groupHref={group.pulp_href}
          existingUsernames={(membersQuery.data?.results ?? []).map((m) => m.username)}
          onClose={() => setIsAddOpen(false)}
        />
      ) : null}
    </>
  );
}
