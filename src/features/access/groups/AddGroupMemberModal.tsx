import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";

import { listAllUsers } from "../../../api/client/access/users";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useAddGroupUserMutation } from "./useGroupMembershipMutations";

export function AddGroupMemberModal({
  groupHref,
  existingUsernames,
  onClose,
}: {
  groupHref: string;
  existingUsernames: string[];
  onClose: () => void;
}) {
  const [username, setUsername] = useState("");
  const addMutation = useAddGroupUserMutation();

  const usersQuery = useQuery({
    queryKey: ["pulp", "access", "users", "all"],
    queryFn: listAllUsers,
  });
  const candidates = (usersQuery.data ?? []).filter(
    (u) => !existingUsernames.includes(u.username),
  );

  const handleSubmit = () => {
    addMutation.mutate({ groupHref, username }, { onSuccess: () => onClose() });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="add-group-member-title"
      variant="medium"
    >
      <ModalHeader title="Add a member" labelId="add-group-member-title" />
      <ModalBody>
        <Form>
          {addMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                addMutation.error instanceof PulpApiError
                  ? addMutation.error.message
                  : "Could not add the member."
              }
            />
          ) : null}
          <FormGroup label="User" isRequired fieldId="add-member-user">
            <FormSelect
              id="add-member-user"
              value={username}
              onChange={(_event, value) => setUsername(value)}
            >
              <FormSelectOption key="" value="" label="Select a user…" />
              {candidates.map((u) => (
                <FormSelectOption
                  key={u.pulp_href}
                  value={u.username}
                  label={u.username}
                />
              ))}
            </FormSelect>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={!username || addMutation.isPending}
          isLoading={addMutation.isPending}
          onClick={handleSubmit}
        >
          Add
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
