import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  TextArea,
  TextInput,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";

import { listAllGemRemotes } from "../../../api/client/gem/remotes";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useCreateGemRepositoryMutation } from "./useCreateGemRepositoryMutation";

export function CreateRepositoryModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [remote, setRemote] = useState("");
  const createMutation = useCreateGemRepositoryMutation();
  const navigate = useNavigate();

  const remotesQuery = useQuery({
    queryKey: ["pulp", "gem", "remotes", "all"],
    queryFn: listAllGemRemotes,
  });

  const handleSubmit = () => {
    createMutation.mutate(
      {
        name,
        description: description || undefined,
        remote: remote || undefined,
      },
      {
        onSuccess: (repository) => {
          onClose();
          navigate(`/gems/repositories/${encodeURIComponent(repository.name)}`);
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
      <ModalHeader title="Create Gem repository" labelId="create-repository-title" />
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
          <FormGroup label="Default remote" fieldId="repository-remote">
            <FormSelect
              id="repository-remote"
              value={remote}
              onChange={(_event, value) => setRemote(value)}
            >
              <FormSelectOption key="" value="" label="No default remote" />
              {(remotesQuery.data ?? []).map((r) => (
                <FormSelectOption key={r.pulp_href} value={r.pulp_href} label={r.name} />
              ))}
            </FormSelect>
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
