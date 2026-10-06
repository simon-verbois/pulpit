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
  TextArea,
  TextInput,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";

import { listAllDebRemotes } from "../../../api/client/deb/remotes";
import type { DebRepository } from "../../../api/client/deb/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useUpdateDebRepositoryMutation } from "./useUpdateDebRepositoryMutation";

export function EditRepositoryModal({
  repository,
  onClose,
  navigateOnRename = true,
}: {
  repository: DebRepository;
  onClose: () => void;
  /** Follow a rename to the new detail URL - off when editing from the list. */
  navigateOnRename?: boolean;
}) {
  const [name, setName] = useState(repository.name);
  const [description, setDescription] = useState(repository.description ?? "");
  const [remote, setRemote] = useState(repository.remote ?? "");
  const [autopublish, setAutopublish] = useState(repository.autopublish);
  const updateMutation = useUpdateDebRepositoryMutation();
  const navigate = useNavigate();

  const remotesQuery = useQuery({
    queryKey: ["pulp", "deb", "remotes", "all"],
    queryFn: listAllDebRemotes,
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
        },
      },
      {
        onSuccess: () => {
          onClose();
          if (navigateOnRename && name !== repository.name) {
            navigate(`/deb/repositories/${encodeURIComponent(name)}`);
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
