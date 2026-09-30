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
import type { RpmRepository } from "../../../api/client/rpm/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { rpmRemoteOptionsQueryKey } from "../remotes/queryKeys";
import { RemoteOptionGroups } from "./RemoteOptionGroups";
import { useUpdateRpmRepositoryMutation } from "./useUpdateRpmRepositoryMutation";

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
  const updateMutation = useUpdateRpmRepositoryMutation();
  const navigate = useNavigate();

  const remotesQuery = useQuery({
    queryKey: rpmRemoteOptionsQueryKey,
    queryFn: listAllRpmRemoteOptions,
  });

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        href: repository.pulp_href,
        name: repository.name,
        data: {
          name: name !== repository.name ? name : undefined,
          description: description || null,
          remote: remote || null,
          autopublish,
          // Signing is not editable per-repository (Administration →
          // Repository Signing applies automatically instead, including a
          // bulk "Sign all repositories…" for repositories that predate
          // it) - leaving these fields out of this PATCH entirely means
          // editing anything else here never touches a repository's
          // existing signing state.
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
              <RemoteOptionGroups remotes={remotesQuery.data ?? []} />
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
