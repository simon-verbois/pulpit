import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";

import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useCreateGroupMutation } from "./useCreateGroupMutation";

export function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const createMutation = useCreateGroupMutation();
  const navigate = useNavigate();

  const handleSubmit = () => {
    createMutation.mutate(
      { name },
      {
        onSuccess: (group) => {
          onClose();
          navigate(`/access/groups/${encodeURIComponent(group.name)}`);
        },
      },
    );
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="create-group-title" variant="medium">
      <ModalHeader title="Create group" labelId="create-group-title" />
      <ModalBody>
        <Form>
          {createMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                createMutation.error instanceof PulpApiError
                  ? createMutation.error.message
                  : "Could not create the group."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="group-name">
            <TextInput
              id="group-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={!name || createMutation.isPending}
          isLoading={createMutation.isPending}
          onClick={handleSubmit}
        >
          Create
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
