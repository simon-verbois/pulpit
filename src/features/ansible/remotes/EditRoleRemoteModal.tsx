import { useState } from "react";
import {
  Alert,
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
  TextInput,
} from "@patternfly/react-core";

import type { RemotePolicy, RoleRemote } from "../../../api/client/ansible/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useUpdateRoleRemoteMutation } from "./useUpdateRoleRemoteMutation";

const POLICIES: { value: RemotePolicy; label: string }[] = [
  { value: "immediate", label: "Immediate - download all content now" },
  { value: "on_demand", label: "On demand - download content when requested" },
  { value: "streamed", label: "Streamed - never store content locally" },
];

export function EditRoleRemoteModal({
  remote,
  onClose,
}: {
  remote: RoleRemote;
  onClose: () => void;
}) {
  const [name, setName] = useState(remote.name);
  const [url, setUrl] = useState(remote.url);
  const [policy, setPolicy] = useState<RemotePolicy>(remote.policy);
  const [connectionSettings, setConnectionSettings] = useState<RemoteConnectionSettings>({
    username: "",
    password: "",
  });
  const updateMutation = useUpdateRoleRemoteMutation();

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        href: remote.pulp_href,
        name: remote.name,
        data: {
          name: name !== remote.name ? name : undefined,
          url,
          policy,
          username: connectionSettings.username || undefined,
          password: connectionSettings.password || undefined,
        },
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="edit-role-remote-title"
      variant="medium"
    >
      <ModalHeader title={`Edit "${remote.name}"`} labelId="edit-role-remote-title" />
      <ModalBody>
        <Form>
          {updateMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                updateMutation.error instanceof PulpApiError
                  ? updateMutation.error.message
                  : "Could not update the remote."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="role-remote-edit-name">
            <TextInput
              id="role-remote-edit-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="URL" isRequired fieldId="role-remote-edit-url">
            <TextInput
              id="role-remote-edit-url"
              isRequired
              type="url"
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Sync policy" fieldId="role-remote-edit-policy">
            <FormSelect
              id="role-remote-edit-policy"
              value={policy}
              onChange={(_event, value) => setPolicy(value as RemotePolicy)}
            >
              {POLICIES.map((option) => (
                <FormSelectOption
                  key={option.value}
                  value={option.value}
                  label={option.label}
                />
              ))}
            </FormSelect>
          </FormGroup>
          <RemoteConnectionSettingsFields
            idPrefix="edit-role-remote"
            value={connectionSettings}
            onChange={setConnectionSettings}
            hiddenFields={remote.hidden_fields}
          />
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
              isDisabled={!name || !url || updateMutation.isPending}
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
