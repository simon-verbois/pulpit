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
import { computeRpmRepoConfig } from "../../../api/client/rpm/repoConfig";
import type { RpmRepository } from "../../../api/client/rpm/types";
import { useContentOrigin } from "../../../hooks/useContentOrigin";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useUpdateRpmRepositoryMutation } from "../repositories/useUpdateRpmRepositoryMutation";
import { usePublishRpmRepositoryMutation } from "../repositories/usePublishRpmRepositoryMutation";
import { useCreateRpmDistributionMutation } from "./useCreateRpmDistributionMutation";

interface CreateDistributionModalProps {
  repository: RpmRepository;
  onClose: () => void;
}

/** Distributions are managed from the repository they publish (see
 * RepositoryDistributionsTab) - there's no standalone "create for any
 * repository" flow, so the repository is fixed, not a picker.
 *
 * Also brings this repository's `repo_config` up to date with its current
 * signing configuration and re-publishes before the new distribution goes
 * live - VERIFIED live: `repo_config` changes are read from the
 * *publication*, not the live repository, so a stale one (e.g. this
 * repository predates signing being turned on, or was never explicitly
 * configured) would otherwise keep serving an outdated `config.repo`
 * indefinitely. Both requests reserve the same repository resource, so
 * Pulp's own per-resource task queue runs them in this submitted order
 * (VERIFIED live) - no manual wait-for-task-completion needed here. */
export function CreateDistributionModal({
  repository,
  onClose,
}: CreateDistributionModalProps) {
  const [basePathSuffix, setBasePathSuffix] = useState("");
  const basePath = buildDistributionBasePath("rpm", basePathSuffix);
  const contentOrigin = useContentOrigin();
  const updateRepositoryMutation = useUpdateRpmRepositoryMutation();
  const publishMutation = usePublishRpmRepositoryMutation();
  const createMutation = useCreateRpmDistributionMutation();

  const handleSubmit = () => {
    updateRepositoryMutation.mutate({
      href: repository.pulp_href,
      name: repository.name,
      data: {
        repo_config: computeRpmRepoConfig(
          Boolean(repository.package_signing_service),
          Boolean(repository.metadata_signing_service),
          contentOrigin,
        ),
      },
    });
    publishMutation.mutate({ href: repository.pulp_href, name: repository.name });
    // Pulp requires a `name` distinct from `base_path`, but both are
    // globally-unique free-text identifiers (VERIFIED live) - reusing the
    // user-entered suffix as the name avoids asking for the same thing
    // twice, without the "rpm/" module prefix that only `base_path` needs
    // (that prefix is what namespaces the URL, not a meaningful part of a
    // human-facing name).
    createMutation.mutate(
      {
        name: basePathSuffix,
        base_path: basePath,
        repository: repository.pulp_href,
        generate_repo_config: true,
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
        title={`Create distribution for "${repository.name}"`}
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
              prefix={`${contentOrigin}/pulp/content/${distributionPathPrefix("rpm")}`}
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
