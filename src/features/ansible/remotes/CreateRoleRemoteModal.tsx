import { useState } from "react";
import {
  Alert,
  Button,
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

import type { RemotePolicy } from "../../../api/client/ansible/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useCreateRoleRemoteMutation } from "./useCreateRoleRemoteMutation";

const POLICIES: { value: RemotePolicy; label: string }[] = [
  { value: "immediate", label: "Immediate - download all content now" },
  { value: "on_demand", label: "On demand - download content when requested" },
  { value: "streamed", label: "Streamed - never store content locally" },
];

const EMPTY_CONNECTION_SETTINGS: RemoteConnectionSettings = {
  proxy_url: "",
  proxy_username: "",
  proxy_password: "",
  username: "",
  password: "",
  tls_validation: true,
  ca_cert: "",
};

/** Classic pre-collections Galaxy roles (`galaxy.ansible.com/api/v1/roles/`
 * style sources) - same shape as a standard RPM remote. */
export function CreateRoleRemoteModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [policy, setPolicy] = useState<RemotePolicy>("immediate");
  const [connectionSettings, setConnectionSettings] = useState(EMPTY_CONNECTION_SETTINGS);
  const createMutation = useCreateRoleRemoteMutation();

  const handleSubmit = () => {
    createMutation.mutate(
      {
        name,
        url,
        policy,
        proxy_url: connectionSettings.proxy_url || undefined,
        proxy_username: connectionSettings.proxy_username || undefined,
        proxy_password: connectionSettings.proxy_password || undefined,
        username: connectionSettings.username || undefined,
        password: connectionSettings.password || undefined,
        tls_validation: connectionSettings.tls_validation,
        ca_cert: connectionSettings.ca_cert || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="create-role-remote-title"
      variant="medium"
    >
      <ModalHeader title="Create Role remote" labelId="create-role-remote-title" />
      <ModalBody>
        <Form>
          {createMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                createMutation.error instanceof PulpApiError
                  ? createMutation.error.message
                  : "Could not create the remote."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="role-remote-name">
            <TextInput
              id="role-remote-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="URL" isRequired fieldId="role-remote-url">
            <TextInput
              id="role-remote-url"
              isRequired
              type="url"
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Sync policy" fieldId="role-remote-policy">
            <FormSelect
              id="role-remote-policy"
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
            idPrefix="create-role-remote"
            value={connectionSettings}
            onChange={setConnectionSettings}
          />
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={!name || !url || createMutation.isPending}
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
