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
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
  TextInput,
} from "@patternfly/react-core";

import {
  buildDistributionBasePath,
  distributionPathPrefix,
} from "../../../api/distributions/basePath";
import { listAllRpmRemotes } from "../../../api/client/rpm/remotes";
import { computeRpmRepoConfig } from "../../../api/client/rpm/repoConfig";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useContentOrigin } from "../../../hooks/useContentOrigin";
import { useCreateRpmDistributionMutation } from "../distributions/useCreateRpmDistributionMutation";
import { useCreateRpmRepositoryMutation } from "./useCreateRpmRepositoryMutation";
import { useRepositorySigningPolicyQuery } from "./useRepositorySigningPolicyQuery";

export function CreateRepositoryModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [remote, setRemote] = useState("");
  // Defaults on: without a publication, a distribution serves nothing (a
  // real 404, VERIFIED live) - autopublish keeps content servable without a
  // separate manual "Publish" step after every sync. See
  // src/api/client/rpm/publications.ts and the Overview tab's "Publish now".
  const [autopublish, setAutopublish] = useState(true);
  // Defaults on too - the common case is "sync this repo and serve it",
  // and a repository with no distribution at all is otherwise unreachable
  // by any client. Reuses the repository's own name as both the
  // distribution's name and base_path suffix (same convention as
  // CreateDistributionModal), so it's immediately reachable at a
  // predictable URL without a second manual step.
  const [createDistribution, setCreateDistribution] = useState(true);
  const createMutation = useCreateRpmRepositoryMutation();
  const createDistributionMutation = useCreateRpmDistributionMutation();
  const navigate = useNavigate();
  const signingPolicyQuery = useRepositorySigningPolicyQuery();
  const contentOrigin = useContentOrigin();

  const remotesQuery = useQuery({
    queryKey: ["pulp", "rpm", "remotes", "all"],
    queryFn: listAllRpmRemotes,
  });

  const handleSubmit = () => {
    // Signing is fully automatic, not a per-repository choice (Administration
    // → Repository Signing) - applied here whenever the corresponding
    // global policy is enabled, same as it would be for any other
    // repository from now on.
    const policy = signingPolicyQuery.data;
    const willPackageSign = Boolean(policy?.package_signing_enabled);
    const willMetadataSign = Boolean(policy?.metadata_signing_enabled);
    createMutation.mutate(
      {
        name,
        description: description || undefined,
        remote: remote || undefined,
        autopublish,
        package_signing_service: willPackageSign
          ? policy?.package_signing_service
          : undefined,
        package_signing_fingerprint: willPackageSign
          ? policy?.package_signing_fingerprint
          : undefined,
        metadata_signing_service: willMetadataSign
          ? policy?.metadata_signing_service
          : undefined,
        // Computed from the same signing booleans above (not from a
        // repository response - this repository doesn't exist yet) so the
        // very first publish this repository ever gets already carries the
        // right gpgcheck/repo_gpgcheck/sslverify - see CreateDistributionModal
        // for why an existing repository needs a live re-publish instead.
        repo_config: computeRpmRepoConfig(
          willPackageSign,
          willMetadataSign,
          contentOrigin,
        ),
      },
      {
        onSuccess: (repository) => {
          if (createDistribution) {
            createDistributionMutation.mutate({
              name: repository.name,
              base_path: buildDistributionBasePath("rpm", repository.name),
              repository: repository.pulp_href,
              generate_repo_config: true,
            });
          }
          onClose();
          navigate(`/rpm/repositories/${encodeURIComponent(repository.name)}`);
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
      <ModalHeader title="Create RPM repository" labelId="create-repository-title" />
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
          <FormGroup fieldId="repository-create-distribution">
            <Checkbox
              id="repository-create-distribution"
              label="Create a distribution for this repository"
              description={
                name
                  ? `Will be reachable at ${contentOrigin}/pulp/content/${distributionPathPrefix("rpm")}${name}/`
                  : "Named after this repository - reachable at .../pulp/content/rpm/<name>/"
              }
              isChecked={createDistribution}
              onChange={(_event, checked) => setCreateDistribution(checked)}
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
