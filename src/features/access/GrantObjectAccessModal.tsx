import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";

import { listAllRoles } from "../../api/client/access/roles";
import { PulpApiError } from "../../api/errors/PulpApiError";

interface GrantObjectAccessModalProps {
  objectLabel: string;
  onGrant: (args: { role: string; users: string[]; groups: string[] }) => void;
  isPending: boolean;
  error: unknown;
  onClose: () => void;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
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
  const [users, setUsers] = useState("");
  const [groups, setGroups] = useState("");

  const rolesQuery = useQuery({
    queryKey: ["pulp", "access", "roles", "all"],
    queryFn: listAllRoles,
  });
  const sortedRoles = [...(rolesQuery.data ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const userList = splitList(users);
  const groupList = splitList(groups);

  const handleSubmit = () => {
    onGrant({ role, users: userList, groups: groupList });
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
          <FormGroup label="Role" isRequired fieldId="grant-access-role">
            <FormSelect
              id="grant-access-role"
              value={role}
              onChange={(_event, value) => setRole(value)}
            >
              <FormSelectOption key="" value="" label="Select a role…" />
              {sortedRoles.map((r) => (
                <FormSelectOption key={r.pulp_href} value={r.name} label={r.name} />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Users" fieldId="grant-access-users">
            <TextInput
              id="grant-access-users"
              placeholder="e.g. alice, bob"
              value={users}
              onChange={(_event, value) => setUsers(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>Comma-separated usernames.</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup label="Groups" fieldId="grant-access-groups">
            <TextInput
              id="grant-access-groups"
              placeholder="e.g. release-team"
              value={groups}
              onChange={(_event, value) => setGroups(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>Comma-separated group names.</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={
            !role || (userList.length === 0 && groupList.length === 0) || isPending
          }
          isLoading={isPending}
          onClick={handleSubmit}
        >
          Grant
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
