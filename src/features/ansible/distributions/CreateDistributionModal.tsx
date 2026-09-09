import { useState } from "react";
import {
  Alert,
  Button,
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
import { useContentOrigin } from "../../../hooks/useContentOrigin";
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
  const [basePathSuffix, setBasePathSuffix] = useState("");
  const basePath = buildDistributionBasePath("ansible", basePathSuffix);
  const contentOrigin = useContentOrigin();
  const createMutation = useCreateAnsibleDistributionMutation();

  const handleSubmit = () => {
    // Pulp requires a `name` distinct from `base_path`, but both are
    // globally-unique free-text identifiers (VERIFIED live) - reusing the
    // user-entered suffix as the name avoids asking for the same thing
    // twice, without the "ansible/" module prefix that only `base_path` needs.
    createMutation.mutate(
      { name: basePathSuffix, base_path: basePath, repository: repositoryHref },
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
              prefix={`${contentOrigin}/pulp_ansible/galaxy/${distributionPathPrefix("ansible")}`}
              placeholder="my-repo"
              value={basePathSuffix}
              onChange={setBasePathSuffix}
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
