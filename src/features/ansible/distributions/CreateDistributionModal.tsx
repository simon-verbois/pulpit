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
  TextInput,
} from "@patternfly/react-core";

import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useCreateAnsibleDistributionMutation } from "./useCreateAnsibleDistributionMutation";

interface CreateDistributionModalProps {
  repositoryHref: string;
  repositoryName: string;
  onClose: () => void;
}

/** Distributions are managed from the repository they publish (see
 * RepositoryDistributionsTab) - there's no standalone "create for any
 * repository" flow, so the repository is fixed, not a picker. Unlike RPM,
 * an Ansible distribution needs no separate publication step (VERIFIED live
 * schema: no `publication` field at all) - it serves the repository
 * directly, so content is servable as soon as this completes. */
export function CreateDistributionModal({
  repositoryHref,
  repositoryName,
  onClose,
}: CreateDistributionModalProps) {
  const [name, setName] = useState("");
  const [basePath, setBasePath] = useState("");
  const createMutation = useCreateAnsibleDistributionMutation();

  const handleSubmit = () => {
    createMutation.mutate(
      { name, base_path: basePath, repository: repositoryHref },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="create-distribution-title"
      variant="medium"
    >
      <ModalHeader
        title={`Create distribution for "${repositoryName}"`}
        labelId="create-distribution-title"
      />
      <ModalBody>
        <Form>
          {createMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                createMutation.error instanceof PulpApiError
                  ? createMutation.error.message
                  : "Could not create the distribution."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="distribution-name">
            <TextInput
              id="distribution-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Base path" isRequired fieldId="distribution-base-path">
            <TextInput
              id="distribution-base-path"
              isRequired
              placeholder="e.g. my-repo"
              value={basePath}
              onChange={(_event, value) => setBasePath(value)}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={!name || !basePath || createMutation.isPending}
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
