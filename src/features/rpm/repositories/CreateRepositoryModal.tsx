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

import { listAllRpmRemoteOptions } from "../../../api/client/rpm/remotes";
import { computeRpmRepoConfig } from "../../../api/client/rpm/repoConfig";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { rpmRemoteOptionsQueryKey } from "../remotes/queryKeys";
import { RemoteOptionGroups } from "./RemoteOptionGroups";
import { useContentOrigin } from "../../../hooks/useContentOrigin";
import { useCreateRpmRepositoryMutation } from "./useCreateRpmRepositoryMutation";
import { useRepositorySigningPolicyQuery } from "./useRepositorySigningPolicyQuery";

export function CreateRepositoryModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [remote, setRemote] = useState("");
  // Publishing stays an explicit choice when creating a repository.
  const [autopublish, setAutopublish] = useState(false);
  const createMutation = useCreateRpmRepositoryMutation();
  const navigate = useNavigate();
  const signingPolicyQuery = useRepositorySigningPolicyQuery();
  const contentOrigin = useContentOrigin();

  const remotesQuery = useQuery({
    queryKey: rpmRemoteOptionsQueryKey,
    queryFn: listAllRpmRemoteOptions,
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
              <RemoteOptionGroups remotes={remotesQuery.data ?? []} />
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
