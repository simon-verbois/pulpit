import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";

import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useCreateUserMutation } from "./useCreateUserMutation";

export function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isStaff, setIsStaff] = useState(false);
  const createMutation = useCreateUserMutation();
  const navigate = useNavigate();

  const handleSubmit = () => {
    createMutation.mutate(
      {
        username,
        password: password || undefined,
        email: email || undefined,
        is_staff: isStaff,
      },
      {
        onSuccess: (user) => {
          onClose();
          navigate(`/access/users/${encodeURIComponent(user.username)}`);
        },
      },
    );
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="create-user-title" variant="medium">
      <ModalHeader title="Create user" labelId="create-user-title" />
      <ModalBody>
        <Form>
          {createMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                createMutation.error instanceof PulpApiError
                  ? createMutation.error.message
                  : "Could not create the user."
              }
            />
          ) : null}
          <FormGroup label="Username" isRequired fieldId="user-username">
            <TextInput
              id="user-username"
              isRequired
              value={username}
              onChange={(_event, value) => setUsername(value)}
            />
          </FormGroup>
          <FormGroup label="Password" fieldId="user-password">
            <TextInput
              id="user-password"
              type="password"
              value={password}
              onChange={(_event, value) => setPassword(value)}
            />
          </FormGroup>
          <FormGroup label="Email" fieldId="user-email">
            <TextInput
              id="user-email"
              type="email"
              value={email}
              onChange={(_event, value) => setEmail(value)}
            />
          </FormGroup>
          <FormGroup fieldId="user-is-staff">
            <Checkbox
              id="user-is-staff"
              label="Staff"
              description="Staff accounts can access Django's own admin site, in addition to Pulp's API."
              isChecked={isStaff}
              onChange={(_event, checked) => setIsStaff(checked)}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={!username || createMutation.isPending}
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
