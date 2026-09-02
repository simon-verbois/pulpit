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
import type { RpmRepository } from "../../../api/client/rpm/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useUpdateRpmRepositoryMutation } from "./useUpdateRpmRepositoryMutation";
import { useRepositorySigningPolicyQuery } from "./useRepositorySigningPolicyQuery";
import { RepositorySigningFieldGroup } from "./RepositorySigningFieldGroup";

export function EditRepositoryModal({
  repository,
  onClose,
}: {
  repository: RpmRepository;
  onClose: () => void;
}) {
  const [name, setName] = useState(repository.name);
  const [description, setDescription] = useState(repository.description ?? "");
  const [remote, setRemote] = useState(repository.remote ?? "");
  const [autopublish, setAutopublish] = useState(repository.autopublish);
  const [signPackages, setSignPackages] = useState(
    Boolean(repository.package_signing_service),
  );
  const [signMetadata, setSignMetadata] = useState(
    Boolean(repository.metadata_signing_service),
  );
  const updateMutation = useUpdateRpmRepositoryMutation();
  const navigate = useNavigate();
  const signingPolicyQuery = useRepositorySigningPolicyQuery();

  const remotesQuery = useQuery({
    queryKey: ["pulp", "rpm", "remotes", "all"],
    queryFn: listAllRpmRemotes,
  });

  const handleSubmit = () => {
    const policy = signingPolicyQuery.data;
    updateMutation.mutate(
      {
        href: repository.pulp_href,
        name: repository.name,
        data: {
          name: name !== repository.name ? name : undefined,
          description: description || null,
          remote: remote || null,
          autopublish,
          package_signing_service:
            signPackages && policy?.package_signing_enabled
              ? policy.package_signing_service
              : null,
          package_signing_fingerprint:
            signPackages && policy?.package_signing_enabled
              ? policy.package_signing_fingerprint
              : null,
          metadata_signing_service:
            signMetadata && policy?.metadata_signing_enabled
              ? policy.metadata_signing_service
              : null,
        },
      },
      {
        onSuccess: () => {
          onClose();
          if (name !== repository.name) {
            navigate(`/rpm/repositories/${encodeURIComponent(name)}`);
          }
        },
      },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="edit-repository-title"
      variant="medium"
    >
      <ModalHeader title={`Edit "${repository.name}"`} labelId="edit-repository-title" />
      <ModalBody>
        <Form>
          {updateMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                updateMutation.error instanceof PulpApiError
                  ? updateMutation.error.message
                  : "Could not update the repository."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="repository-edit-name">
            <TextInput
              id="repository-edit-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="repository-edit-description">
            <TextArea
              id="repository-edit-description"
              value={description}
              onChange={(_event, value) => setDescription(value)}
              autoResize
            />
          </FormGroup>
          <FormGroup label="Default remote" fieldId="repository-edit-remote">
            <FormSelect
              id="repository-edit-remote"
              value={remote}
              onChange={(_event, value) => setRemote(value)}
            >
              <FormSelectOption key="" value="" label="No default remote" />
              {(remotesQuery.data ?? []).map((r) => (
                <FormSelectOption key={r.pulp_href} value={r.pulp_href} label={r.name} />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup fieldId="repository-edit-autopublish">
            <Checkbox
              id="repository-edit-autopublish"
              label="Automatically publish after each sync or content change"
              description="Without this, a distribution pointing at this repository won't serve any content until it's published manually."
              isChecked={autopublish}
              onChange={(_event, checked) => setAutopublish(checked)}
            />
          </FormGroup>
          <RepositorySigningFieldGroup
            policy={signingPolicyQuery.data}
            idPrefix="repository-edit"
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
          isDisabled={!name || updateMutation.isPending}
          isLoading={updateMutation.isPending}
          onClick={handleSubmit}
        >
          Save
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
