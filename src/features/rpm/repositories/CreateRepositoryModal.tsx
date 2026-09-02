import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
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

import { listAllRpmRemotes } from "../../../api/client/rpm/remotes";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useCreateRpmRepositoryMutation } from "./useCreateRpmRepositoryMutation";
import { useRepositorySigningPolicyQuery } from "./useRepositorySigningPolicyQuery";
import { RepositorySigningFieldGroup } from "./RepositorySigningFieldGroup";

export function CreateRepositoryModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [remote, setRemote] = useState("");
  // Defaults on: without a publication, a distribution serves nothing (a
  // real 404, VERIFIED live) - autopublish keeps content servable without a
  // separate manual "Publish" step after every sync. See
  // src/api/client/rpm/publications.ts and the Overview tab's "Publish now".
  const [autopublish, setAutopublish] = useState(true);
  const [signPackages, setSignPackages] = useState(true);
  const [signMetadata, setSignMetadata] = useState(true);
  const createMutation = useCreateRpmRepositoryMutation();
  const navigate = useNavigate();
  const signingPolicyQuery = useRepositorySigningPolicyQuery();

  const remotesQuery = useQuery({
    queryKey: ["pulp", "rpm", "remotes", "all"],
    queryFn: listAllRpmRemotes,
  });

  const handleSubmit = () => {
    const policy = signingPolicyQuery.data;
    createMutation.mutate(
      {
        name,
        description: description || undefined,
        remote: remote || undefined,
        autopublish,
        package_signing_service:
          signPackages && policy?.package_signing_enabled
            ? policy.package_signing_service
            : undefined,
        package_signing_fingerprint:
          signPackages && policy?.package_signing_enabled
            ? policy.package_signing_fingerprint
            : undefined,
        metadata_signing_service:
          signMetadata && policy?.metadata_signing_enabled
            ? policy.metadata_signing_service
            : undefined,
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
          <RepositorySigningFieldGroup
            policy={signingPolicyQuery.data}
            idPrefix="repository-create"
            signPackages={signPackages}
            onSignPackagesChange={setSignPackages}
            signMetadata={signMetadata}
            onSignMetadataChange={setSignMetadata}
          />
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={!name || createMutation.isPending}
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
