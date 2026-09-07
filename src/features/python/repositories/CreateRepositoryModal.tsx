import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
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

import { listAllPythonRemotes } from "../../../api/client/python/remotes";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useCreatePythonRepositoryMutation } from "./useCreatePythonRepositoryMutation";

export function CreateRepositoryModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [remote, setRemote] = useState("");
  // Defaults on: without a publication, a distribution serves nothing (a
  // real 404, VERIFIED live) - autopublish keeps content servable without a
  // separate manual "Publish" step after every sync. See
  // src/api/client/python/publications.ts and the Overview tab's "Publish now".
  const [autopublish, setAutopublish] = useState(true);
  const createMutation = useCreatePythonRepositoryMutation();
  const navigate = useNavigate();

  const remotesQuery = useQuery({
    queryKey: ["pulp", "python", "remotes", "all"],
    queryFn: listAllPythonRemotes,
  });

  const handleSubmit = () => {
    createMutation.mutate(
      {
        name,
        description: description || undefined,
        remote: remote || undefined,
        autopublish,
      },
      {
        onSuccess: (repository) => {
          onClose();
          navigate(`/python/repositories/${encodeURIComponent(repository.name)}`);
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
      <ModalHeader title="Create Python repository" labelId="create-repository-title" />
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
          <FormGroup fieldId="repository-autopublish">
            <Checkbox
              id="repository-autopublish"
              label="Automatically publish after each sync or content change"
              description="Without this, a distribution pointing at this repository won't serve any content until it's published manually."
              isChecked={autopublish}
              onChange={(_event, checked) => setAutopublish(checked)}
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
