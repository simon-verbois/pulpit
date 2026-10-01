import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Radio,
  Stack,
  StackItem,
} from "@patternfly/react-core";

import { ErrorState } from "../../../components/ErrorState";
import { LoadingState } from "../../../components/LoadingState";
import {
  buildDistributionBasePath,
  buildVersionedDistributionName,
} from "../../../api/distributions/basePath";
import { computeRpmRepoConfig } from "../../../api/client/rpm/repoConfig";
import { listAllRepositoryVersions } from "../../../api/client/rpm/repositories";
import type { RpmRepository } from "../../../api/client/rpm/types";
import { useContentOrigin } from "../../../hooks/useContentOrigin";
import { useUpdateRpmRepositoryMutation } from "../repositories/useUpdateRpmRepositoryMutation";
import { usePublishRpmRepositoryMutation } from "../repositories/usePublishRpmRepositoryMutation";
import { rpmRepositoryVersionOptionsKey } from "../repositories/queryKeys";
import { useCreateRpmDistributionMutation } from "./useCreateRpmDistributionMutation";
import { useCreatePinnedRpmDistributionMutation } from "./useCreatePinnedRpmDistributionMutation";

type DistributionTarget = "latest" | "version";

interface CreateDistributionModalProps {
  repository: RpmRepository;
  onClose: () => void;
}

/** Distributions are managed from the repository they publish (see
 * RepositoryDistributionsTab) - there's no standalone "create for any
 * repository" flow, so the repository is fixed, not a picker.
 *
 * A latest distribution points at the repository and follows future
 * publications. A pinned distribution first publishes the selected immutable
 * RepositoryVersion, waits for that publication resource, then points at it. */
export function CreateDistributionModal({
  repository,
  onClose,
}: CreateDistributionModalProps) {
  const [target, setTarget] = useState<DistributionTarget>("latest");
  const [selectedVersionHref, setSelectedVersionHref] = useState("");
  const contentOrigin = useContentOrigin();
  const updateRepositoryMutation = useUpdateRpmRepositoryMutation();
  const publishMutation = usePublishRpmRepositoryMutation();
  const createMutation = useCreateRpmDistributionMutation();
  const createPinnedMutation = useCreatePinnedRpmDistributionMutation();
  const versionsQuery = useQuery({
    queryKey: rpmRepositoryVersionOptionsKey(repository.versions_href),
    queryFn: () => listAllRepositoryVersions(repository.versions_href),
    enabled: target === "version",
  });
  const effectiveVersion =
    versionsQuery.data?.find((version) => version.pulp_href === selectedVersionHref) ??
    versionsQuery.data?.[0];
  const effectiveVersionHref = effectiveVersion?.pulp_href ?? "";
  const distributionName = buildVersionedDistributionName(
    repository.name,
    target === "version" ? effectiveVersion?.number : undefined,
  );
  const basePath = buildDistributionBasePath("rpm", distributionName);
  const isSubmitting =
    updateRepositoryMutation.isPending ||
    publishMutation.isPending ||
    createMutation.isPending ||
    createPinnedMutation.isPending;
  const mutationError =
    updateRepositoryMutation.error ??
    publishMutation.error ??
    createMutation.error ??
    createPinnedMutation.error;

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
    const distribution = {
      name: distributionName,
      base_path: basePath,
      generate_repo_config: true,
    };

    if (target === "version") {
      createPinnedMutation.mutate(
        {
          repositoryHref: repository.pulp_href,
          repositoryName: repository.name,
          repositoryVersionHref: effectiveVersionHref,
          distribution,
        },
        { onSuccess: () => onClose() },
      );
      return;
    }

    publishMutation.mutate({ href: repository.pulp_href, name: repository.name });
    createMutation.mutate(
      { ...distribution, repository: repository.pulp_href },
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
          {mutationError ? <ErrorState error={mutationError} /> : null}
          <FormGroup label="Content" isRequired role="group">
            <Stack hasGutter role="radiogroup" aria-label="Distribution content">
              <StackItem>
                <Radio
                  id="distribution-target-latest"
                  name="distribution-target"
                  label="Follow the latest published version"
                  description="This distribution updates whenever a new publication is created."
                  isChecked={target === "latest"}
                  onChange={() => setTarget("latest")}
                />
              </StackItem>
              <StackItem>
                <Radio
                  id="distribution-target-version"
                  name="distribution-target"
                  label="Pin a repository version"
                  description="This distribution remains on the selected version until it is changed."
                  isChecked={target === "version"}
                  onChange={() => setTarget("version")}
                />
              </StackItem>
            </Stack>
          </FormGroup>
          {target === "version" ? (
            <FormGroup
              label="Repository version"
              isRequired
              fieldId="distribution-repository-version"
            >
              {versionsQuery.isPending ? (
                <LoadingState label="Loading repository versions" />
              ) : null}
              {versionsQuery.isError ? (
                <ErrorState
                  error={versionsQuery.error}
                  onRetry={() => versionsQuery.refetch()}
                />
              ) : null}
              {versionsQuery.isSuccess ? (
                <FormSelect
                  id="distribution-repository-version"
                  aria-label="Repository version"
                  value={effectiveVersionHref}
                  onChange={(_event, value) => setSelectedVersionHref(value)}
                  isDisabled={versionsQuery.data.length === 0}
                  isRequired
                >
                  {versionsQuery.data.length === 0 ? (
                    <FormSelectOption value="" label="No retained versions" isDisabled />
                  ) : null}
                  {versionsQuery.data.map((version) => {
                    const packageCount =
                      version.content_summary?.present?.["rpm.package"]?.count;
                    const current = version.pulp_href === repository.latest_version_href;
                    const details = [
                      current ? "current" : null,
                      packageCount === undefined ? null : `${packageCount} packages`,
                    ].filter(Boolean);
                    return (
                      <FormSelectOption
                        key={version.pulp_href}
                        value={version.pulp_href}
                        label={`Version ${version.number}${
                          details.length > 0 ? ` (${details.join(", ")})` : ""
                        }`}
                      />
                    );
                  })}
                </FormSelect>
              ) : null}
            </FormGroup>
          ) : null}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Flex
          justifyContent={{ default: "justifyContentFlexEnd" }}
          style={{ width: "100%" }}
        >
          <FlexItem>
            <Button variant="link" onClick={onClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="primary"
              isDisabled={isSubmitting || (target === "version" && !effectiveVersionHref)}
              isLoading={isSubmitting}
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
