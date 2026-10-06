import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  TextArea,
  TextInput,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";

import type { MavenRepository } from "../../../api/client/maven/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useUpdateMavenRepositoryMutation } from "./useUpdateMavenRepositoryMutation";

export function EditRepositoryModal({
  repository,
  onClose,
  navigateOnRename = true,
}: {
  repository: MavenRepository;
  onClose: () => void;
  /** Follow a rename to the new detail URL - off when editing from the list. */
  navigateOnRename?: boolean;
}) {
  const [name, setName] = useState(repository.name);
  const [description, setDescription] = useState(repository.description ?? "");
  const updateMutation = useUpdateMavenRepositoryMutation();
  const navigate = useNavigate();

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        href: repository.pulp_href,
        name: repository.name,
        data: {
          name: name !== repository.name ? name : undefined,
          description: description || null,
        },
      },
      {
        onSuccess: () => {
          onClose();
          if (navigateOnRename && name !== repository.name) {
            navigate(`/maven/repositories/${encodeURIComponent(name)}`);
          }
        },
      },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="edit-repository-title"
      variant="medium"
    >
      <ModalHeader title={`Edit "${repository.name}"`} labelId="edit-repository-title" />
      <ModalBody>
        <Form>
          {updateMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                updateMutation.error instanceof PulpApiError
                  ? updateMutation.error.message
                  : "Could not update the repository."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="repository-edit-name">
            <TextInput
              id="repository-edit-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="repository-edit-description">
            <TextArea
              id="repository-edit-description"
              value={description}
              onChange={(_event, value) => setDescription(value)}
              autoResize
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
              isDisabled={!name || updateMutation.isPending}
              isLoading={updateMutation.isPending}
              onClick={handleSubmit}
            >
              Save
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
