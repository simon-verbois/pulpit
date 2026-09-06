import { useState } from "react";
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
import { useCreateContainerDistributionMutation } from "./useCreateContainerDistributionMutation";

interface CreateDistributionModalProps {
  repositoryHref: string;
  repositoryName: string;
  onClose: () => void;
}

/** Distributions are managed from the repository they serve (see
 * RepositoryDistributionsTab) - there's no standalone "create for any
 * repository" flow, so the repository is fixed, not a picker. No
 * publication step needed (VERIFIED live schema: no `publication` field at
 * all) - it serves the repository directly. */
export function CreateDistributionModal({
  repositoryHref,
  repositoryName,
  onClose,
}: CreateDistributionModalProps) {
  const [name, setName] = useState("");
  const [basePath, setBasePath] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const createMutation = useCreateContainerDistributionMutation();

  const handleSubmit = () => {
    createMutation.mutate(
      { name, base_path: basePath, repository: repositoryHref, private: isPrivate },
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
              placeholder="e.g. my-team/my-image"
              value={basePath}
              onChange={(_event, value) => setBasePath(value)}
            />
          </FormGroup>
          <FormGroup fieldId="distribution-private">
            <Checkbox
              id="distribution-private"
              label="Private"
              description="Requires authentication to pull - unchecked, anyone who can reach the registry can pull this content."
              isChecked={isPrivate}
              onChange={(_event, checked) => setIsPrivate(checked)}
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
              isDisabled={!name || !basePath || createMutation.isPending}
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
