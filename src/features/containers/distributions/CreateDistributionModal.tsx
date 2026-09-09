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
} from "@patternfly/react-core";

import { BasePathField } from "../../../components/BasePathField";
import {
  buildDistributionBasePath,
  distributionPathPrefix,
} from "../../../api/distributions/basePath";
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
  const [basePathSuffix, setBasePathSuffix] = useState("");
  const basePath = buildDistributionBasePath("container", basePathSuffix);
  const [isPrivate, setIsPrivate] = useState(false);
  const createMutation = useCreateContainerDistributionMutation();

  const handleSubmit = () => {
    // Pulp requires a `name` distinct from `base_path`, but both are
    // globally-unique free-text identifiers (VERIFIED live) - reusing the
    // user-entered suffix as the name avoids asking for the same thing
    // twice, without the "container/" module prefix that only `base_path` needs.
    createMutation.mutate(
      {
        name: basePathSuffix,
        base_path: basePath,
        repository: repositoryHref,
        private: isPrivate,
      },
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
          <FormGroup label="Base path" isRequired fieldId="distribution-base-path">
            <BasePathField
              id="distribution-base-path"
              isRequired
              prefix={`${window.location.host}/${distributionPathPrefix("container")}`}
              placeholder="my-team/my-image"
              value={basePathSuffix}
              onChange={setBasePathSuffix}
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
              isDisabled={!basePathSuffix || createMutation.isPending}
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
