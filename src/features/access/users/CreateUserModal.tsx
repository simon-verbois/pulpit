import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
  Flex,
  FlexItem,
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
import { PasswordField } from "./PasswordField";
import { evaluatePasswordPolicy } from "./passwordPolicy";

export function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isStaff, setIsStaff] = useState(false);
  const createMutation = useCreateUserMutation();
  const navigate = useNavigate();
  const passwordPolicy = evaluatePasswordPolicy(password, { username, email });

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
              autoComplete="off"
              value={username}
              onChange={(_event, value) => setUsername(value)}
            />
          </FormGroup>
          <PasswordField
            id="user-password"
            value={password}
            onChange={setPassword}
            username={username}
            email={email}
          />
          <FormGroup label="Email" fieldId="user-email">
            <TextInput
              id="user-email"
              type="email"
              autoComplete="off"
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
                !username ||
                (password.length > 0 && !passwordPolicy.isValid) ||
                createMutation.isPending
              }
              isLoading={createMutation.isPending}
              onClick={handleSubmit}
            >
              Create
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
