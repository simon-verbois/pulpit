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

import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useCreateMavenRepositoryMutation } from "./useCreateMavenRepositoryMutation";

/** No "Default remote" field here - VERIFIED live: unlike every other
 * plugin's repository in this app, pulp_maven's Repository has no `remote`
 * field at all (content only gets in via direct upload). */
export function CreateRepositoryModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createMutation = useCreateMavenRepositoryMutation();
  const navigate = useNavigate();

  const handleSubmit = () => {
    createMutation.mutate(
      { name, description: description || undefined },
      {
        onSuccess: (repository) => {
          onClose();
          navigate(`/maven/repositories/${encodeURIComponent(repository.name)}`);
        },
      },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="create-repository-title"
      variant="medium"
    >
      <ModalHeader title="Create Maven repository" labelId="create-repository-title" />
      <ModalBody>
        <Form>
          {createMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                createMutation.error instanceof PulpApiError
                  ? createMutation.error.message
                  : "Could not create the repository."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="repository-name">
            <TextInput
              id="repository-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="repository-description">
            <TextArea
              id="repository-description"
              value={description}
              onChange={(_event, value) => setDescription(value)}
              autoResize
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Flex justifyContent={{ default: "justifyContentFlexEnd" }} style={{ width: "100%" }}>
          <FlexItem>
            <Button variant="link" onClick={onClose}>
              Cancel
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="primary"
              isDisabled={!name || createMutation.isPending}
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
