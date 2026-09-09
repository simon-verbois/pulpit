import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  AlertActionLink,
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";

import { listAllGroups } from "../../api/client/access/groups";
import { listAllRoles } from "../../api/client/access/roles";
import { listAllUsers } from "../../api/client/access/users";
import { PulpApiError } from "../../api/errors/PulpApiError";
import { groupsQueryKey } from "./groups/queryKeys";
import { SearchableMultiSelect } from "./SearchableMultiSelect";
import { SearchableSingleSelect } from "./SearchableSingleSelect";
import { usersQueryKey } from "./users/queryKeys";

interface GrantObjectAccessModalProps {
  objectLabel: string;
  onGrant: (args: { role: string; users: string[]; groups: string[] }) => void;
  isPending: boolean;
  error: unknown;
  onClose: () => void;
}

/** Shared by every plugin's Repository "Access" tab (RPM/Ansible/Container -
 * see ObjectAccessTab.tsx) - grants a Role to one or more users/groups,
 * scoped to this one object, via the generic `add_role/` action every
 * RBAC-protected object exposes (VERIFIED live: same shape regardless of
 * plugin/content type). */
export function GrantObjectAccessModal({
  objectLabel,
  onGrant,
  isPending,
  error,
  onClose,
}: GrantObjectAccessModalProps) {
  const [role, setRole] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);

  const rolesQuery = useQuery({
    queryKey: ["pulp", "access", "roles", "all"],
    queryFn: listAllRoles,
  });
  const sortedRoles = [...(rolesQuery.data ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const usersQuery = useQuery({
    queryKey: usersQueryKey(),
    queryFn: listAllUsers,
  });
  const groupsQuery = useQuery({
    queryKey: groupsQueryKey(),
    queryFn: listAllGroups,
  });

  const handleSubmit = () => {
    onGrant({ role, users, groups });
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="grant-access-title" variant="medium">
      <ModalHeader
        title={`Grant access to ${objectLabel}`}
        labelId="grant-access-title"
      />
      <ModalBody>
        <Form>
          {error ? (
            <Alert
              variant="danger"
              isInline
              title={
                error instanceof PulpApiError ? error.message : "Could not grant access."
              }
            />
          ) : null}
          {rolesQuery.isError ? (
            <Alert
              variant="danger"
              isInline
              title="Could not load roles."
              actionLinks={
                <AlertActionLink onClick={() => rolesQuery.refetch()}>
                  Retry
                </AlertActionLink>
              }
            />
          ) : null}
          {usersQuery.isError ? (
            <Alert
              variant="danger"
              isInline
              title="Could not load users."
              actionLinks={
                <AlertActionLink onClick={() => usersQuery.refetch()}>
                  Retry
                </AlertActionLink>
              }
            />
          ) : null}
          {groupsQuery.isError ? (
            <Alert
              variant="danger"
              isInline
              title="Could not load groups."
              actionLinks={
                <AlertActionLink onClick={() => groupsQuery.refetch()}>
                  Retry
                </AlertActionLink>
              }
            />
          ) : null}
          <FormGroup label="Role" isRequired fieldId="grant-access-role">
            <SearchableSingleSelect
              id="grant-access-role"
              ariaLabel="Role"
              placeholder={rolesQuery.isPending ? "Loading roles…" : "Select a role…"}
              options={sortedRoles.map((r) => r.name)}
              selected={role}
              onChange={setRole}
              noOptionsText="No roles are available."
              isDisabled={rolesQuery.isError}
            />
          </FormGroup>
          <FormGroup label="Users" fieldId="grant-access-users">
            <SearchableMultiSelect
              id="grant-access-users"
              ariaLabel="Users"
              placeholder={usersQuery.isPending ? "Loading users…" : "Select users…"}
              options={(usersQuery.data ?? []).map((user) => user.username)}
              selected={users}
              onChange={setUsers}
              noOptionsText="No users are available."
              isDisabled={usersQuery.isError}
            />
          </FormGroup>
          <FormGroup label="Groups" fieldId="grant-access-groups">
            <SearchableMultiSelect
              id="grant-access-groups"
              ariaLabel="Groups"
              placeholder={groupsQuery.isPending ? "Loading groups…" : "Select groups…"}
              options={(groupsQuery.data ?? []).map((group) => group.name)}
              selected={groups}
              onChange={setGroups}
              noOptionsText="No groups are available."
              isDisabled={groupsQuery.isError}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Flex
          justifyContent={{ default: "justifyContentFlexEnd" }}
          style={{ width: "100%" }}
        >
          <FlexItem>
            <Button variant="link" onClick={onClose}>
              Cancel
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="primary"
              isDisabled={
                !role || (users.length === 0 && groups.length === 0) || isPending
              }
              isLoading={isPending}
              onClick={handleSubmit}
            >
              Grant
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
