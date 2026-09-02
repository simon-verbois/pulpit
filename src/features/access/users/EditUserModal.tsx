import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
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

import type { User } from "../../../api/client/access/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useUpdateUserMutation } from "./useUpdateUserMutation";

export function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [username, setUsername] = useState(user.username);
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [email, setEmail] = useState(user.email);
  const [isStaff, setIsStaff] = useState(user.is_staff);
  const [isActive, setIsActive] = useState(user.is_active);
  // Blank means "leave unchanged" - Pulp never echoes a password back
  // (VERIFIED live, see User.hidden_fields), same pattern as every remote's
  // proxy/auth credentials elsewhere in this app.
  const [newPassword, setNewPassword] = useState("");
  const updateMutation = useUpdateUserMutation();
  const navigate = useNavigate();

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        href: user.pulp_href,
        username: user.username,
        data: {
          username: username !== user.username ? username : undefined,
          first_name: firstName,
          last_name: lastName,
          email,
          is_staff: isStaff,
          is_active: isActive,
          password: newPassword || undefined,
        },
      },
      {
        onSuccess: () => {
          onClose();
          if (username !== user.username) {
            navigate(`/access/users/${encodeURIComponent(username)}`);
          }
        },
      },
    );
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="edit-user-title" variant="medium">
      <ModalHeader title={`Edit "${user.username}"`} labelId="edit-user-title" />
      <ModalBody>
        <Form>
          {updateMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                updateMutation.error instanceof PulpApiError
                  ? updateMutation.error.message
                  : "Could not update the user."
              }
            />
          ) : null}
          <FormGroup label="Username" isRequired fieldId="user-edit-username">
            <TextInput
              id="user-edit-username"
              isRequired
              value={username}
              onChange={(_event, value) => setUsername(value)}
            />
          </FormGroup>
          <FormGroup label="First name" fieldId="user-edit-first-name">
            <TextInput
              id="user-edit-first-name"
              value={firstName}
              onChange={(_event, value) => setFirstName(value)}
            />
          </FormGroup>
          <FormGroup label="Last name" fieldId="user-edit-last-name">
            <TextInput
              id="user-edit-last-name"
              value={lastName}
              onChange={(_event, value) => setLastName(value)}
            />
          </FormGroup>
          <FormGroup label="Email" fieldId="user-edit-email">
            <TextInput
              id="user-edit-email"
              type="email"
              value={email}
              onChange={(_event, value) => setEmail(value)}
            />
          </FormGroup>
          <FormGroup label="New password" fieldId="user-edit-password">
            <TextInput
              id="user-edit-password"
              type="password"
              value={newPassword}
              onChange={(_event, value) => setNewPassword(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>Leave blank to keep the current password.</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup fieldId="user-edit-is-staff">
            <Checkbox
              id="user-edit-is-staff"
              label="Staff"
              description="Staff accounts can access Django's own admin site, in addition to Pulp's API."
              isChecked={isStaff}
              onChange={(_event, checked) => setIsStaff(checked)}
            />
          </FormGroup>
          <FormGroup fieldId="user-edit-is-active">
            <Checkbox
              id="user-edit-is-active"
              label="Active"
              description="An inactive account can't log in at all."
              isChecked={isActive}
              onChange={(_event, checked) => setIsActive(checked)}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={!username || updateMutation.isPending}
          isLoading={updateMutation.isPending}
          onClick={handleSubmit}
        >
          Save
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
