import { useState } from "react";
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
  NumberInput,
  TextArea,
  TextInput,
} from "@patternfly/react-core";

import type { AnsibleRepository } from "../../../api/client/ansible/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useAllRemotesForPicker } from "../remotes/useAllRemotesForPicker";
import { useUpdateAnsibleRepositoryMutation } from "./useUpdateAnsibleRepositoryMutation";

export function EditRepositoryModal({
  repository,
  onClose,
}: {
  repository: AnsibleRepository;
  onClose: () => void;
}) {
  const [name, setName] = useState(repository.name);
  const [description, setDescription] = useState(repository.description ?? "");
  const [remote, setRemote] = useState(repository.remote ?? "");
  const [retainVersions, setRetainVersions] = useState(
    repository.retain_repo_versions ?? undefined,
  );
  const [gpgkey, setGpgkey] = useState(repository.gpgkey ?? "");
  const [isPrivate, setIsPrivate] = useState(repository.private);
  const updateMutation = useUpdateAnsibleRepositoryMutation();
  const navigate = useNavigate();

  // Same combined 3-flavor picker as CreateRepositoryModal - a repository
  // can hold both collections and roles at once (VERIFIED live), so a
  // Git/Role remote is just as legitimate a default as a Collection one.
  const remotesQuery = useAllRemotesForPicker();

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        href: repository.pulp_href,
        name: repository.name,
        data: {
          name: name !== repository.name ? name : undefined,
          description: description || null,
          remote: remote || null,
          retain_repo_versions: retainVersions ?? null,
          gpgkey: gpgkey || null,
          private: isPrivate,
        },
      },
      {
        onSuccess: () => {
          onClose();
          if (name !== repository.name) {
            navigate(`/ansible/repositories/${encodeURIComponent(name)}`);
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
                <FormSelectOption key={r.href} value={r.href} label={r.label} />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Retain versions" fieldId="repository-edit-retain">
            <NumberInput
              id="repository-edit-retain"
              value={retainVersions}
              min={1}
              onMinus={() => setRetainVersions((v) => (v ? Math.max(1, v - 1) : v))}
              onPlus={() => setRetainVersions((v) => (v ? v + 1 : 1))}
              onChange={(event) => {
                const value = Number((event.target as HTMLInputElement).value);
                setRetainVersions(Number.isNaN(value) ? undefined : value);
              }}
            />
          </FormGroup>
          <FormGroup label="GPG public key" fieldId="repository-edit-gpgkey">
            <TextArea
              id="repository-edit-gpgkey"
              value={gpgkey}
              onChange={(_event, value) => setGpgkey(value)}
              placeholder="Used to verify signed collections synced from a remote"
              autoResize
            />
          </FormGroup>
          <FormGroup fieldId="repository-edit-private">
            <Checkbox
              id="repository-edit-private"
              label="Private"
              description="Requires authentication for Galaxy-API clients to browse this repository's content."
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
              isDisabled={!name || updateMutation.isPending}
              isLoading={updateMutation.isPending}
              onClick={handleSubmit}
            >
              Save
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
