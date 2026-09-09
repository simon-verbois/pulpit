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
  FormHelperText,
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
import { SearchableSingleSelect } from "./SearchableSingleSelect";

interface AssignRoleModalProps {
  /** "user" or "group" - only used for copy ("Assign a role to this user…"). */
  subjectKind: "user" | "group";
  subjectLabel: string;
  onAssign: (args: { role: string; content_object: string | null }) => void;
  isPending: boolean;
  error: unknown;
  onClose: () => void;
}

/**
 * Shared by both Users and Groups' Roles tabs (src/features/access/users/UserRolesTab.tsx,
 * .../groups/GroupRolesTab.tsx) - picks a Role and optionally scopes the
 * assignment to one specific object by its href. VERIFIED live gotcha:
 * sending no `content_object` at all is a 400 ("Either 'content_object' or
 * 'content_object_prn' needs to be specified") - a global assignment must
 * send `content_object: null` explicitly, which this always does (the text
 * field's value maps to null when left blank).
 */
export function AssignRoleModal({
  subjectKind,
  subjectLabel,
  onAssign,
  isPending,
  error,
  onClose,
}: AssignRoleModalProps) {
  const [role, setRole] = useState("");
  const [contentObject, setContentObject] = useState("");

  const rolesQuery = useQuery({
    queryKey: ["pulp", "access", "roles", "all"],
    queryFn: listAllRoles,
  });
  const sortedRoles = [...(rolesQuery.data ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const handleSubmit = () => {
    onAssign({ role, content_object: contentObject.trim() || null });
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="assign-role-title" variant="medium">
      <ModalHeader
        title={`Assign a role to ${subjectLabel}`}
        labelId="assign-role-title"
      />
      <ModalBody>
        <Form>
          {error ? (
            <Alert
              variant="danger"
              isInline
              title={
                error instanceof PulpApiError
                  ? error.message
                  : "Could not assign the role."
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
          <FormGroup label="Role" isRequired fieldId="assign-role-select">
            <SearchableSingleSelect
              id="assign-role-select"
              ariaLabel="Role"
              placeholder={rolesQuery.isPending ? "Loading roles…" : "Select a role…"}
              options={sortedRoles.map((r) => r.name)}
              selected={role}
              onChange={setRole}
              noOptionsText="No roles are available."
              isDisabled={rolesQuery.isError}
            />
          </FormGroup>
          <FormGroup label="Scope to a specific object" fieldId="assign-role-object">
            <TextInput
              id="assign-role-object"
              placeholder="e.g. /pulp/api/v3/repositories/rpm/rpm/.../ (leave blank for global)"
              value={contentObject}
              onChange={(_event, value) => setContentObject(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Paste the href of a repository, remote, distribution, etc. to grant this{" "}
                  {subjectKind} the role on that object only - leave blank to grant it
                  globally, across every object of every type.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
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
              isDisabled={!role || isPending}
              isLoading={isPending}
              onClick={handleSubmit}
            >
              Assign
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
