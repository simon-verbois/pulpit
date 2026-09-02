import { useState } from "react";
import {
  Alert,
  Button,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
  TextInput,
} from "@patternfly/react-core";

import type { Role } from "../../../api/client/access/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useUpdateRoleMutation } from "./useUpdateRoleMutation";
import { PermissionsPicker } from "./PermissionsPicker";

export function EditRoleModal({ role, onClose }: { role: Role; onClose: () => void }) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [permissions, setPermissions] = useState<string[]>(role.permissions);
  const updateMutation = useUpdateRoleMutation();

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        href: role.pulp_href,
        data: { name, description: description || undefined, permissions },
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="edit-role-title" variant="large">
      <ModalHeader title={`Edit "${role.name}"`} labelId="edit-role-title" />
      <ModalBody>
        <Form>
          {updateMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                updateMutation.error instanceof PulpApiError
                  ? updateMutation.error.message
                  : "Could not update the role."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="role-edit-name">
            <TextInput
              id="role-edit-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="role-edit-description">
            <TextArea
              id="role-edit-description"
              value={description}
              onChange={(_event, value) => setDescription(value)}
              autoResize
            />
          </FormGroup>
          <FormGroup label="Permissions" isRequired fieldId="role-edit-permissions">
            <PermissionsPicker value={permissions} onChange={setPermissions} />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={!name || permissions.length === 0 || updateMutation.isPending}
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
