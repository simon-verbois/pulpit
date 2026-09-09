import { useState } from "react";
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";

import type { DebRemote, RemotePolicy } from "../../../api/client/deb/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useUpdateDebRemoteMutation } from "./useUpdateDebRemoteMutation";

const POLICIES: { value: RemotePolicy; label: string }[] = [
  { value: "immediate", label: "Immediate - download all content now" },
  { value: "on_demand", label: "On demand - download content when requested" },
  { value: "streamed", label: "Streamed - never store content locally" },
];

export function EditRemoteModal({
  remote,
  onClose,
}: {
  remote: DebRemote;
  onClose: () => void;
}) {
  const [name, setName] = useState(remote.name);
  const [url, setUrl] = useState(remote.url);
  const [distributions, setDistributions] = useState(remote.distributions);
  const [components, setComponents] = useState(remote.components ?? "");
  const [architectures, setArchitectures] = useState(remote.architectures ?? "");
  const [policy, setPolicy] = useState<RemotePolicy>(remote.policy);
  const [connectionSettings, setConnectionSettings] = useState<RemoteConnectionSettings>({
    proxy_url: remote.proxy_url ?? "",
    proxy_username: "",
    proxy_password: "",
    username: "",
    password: "",
    tls_validation: remote.tls_validation,
    ca_cert: remote.ca_cert ?? "",
  });
  const updateMutation = useUpdateDebRemoteMutation();

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        href: remote.pulp_href,
        name: remote.name,
        data: {
          name: name !== remote.name ? name : undefined,
          url,
          distributions,
          components: components || null,
          architectures: architectures || null,
          policy,
          proxy_url: connectionSettings.proxy_url || null,
          proxy_username: connectionSettings.proxy_username || undefined,
          proxy_password: connectionSettings.proxy_password || undefined,
          username: connectionSettings.username || undefined,
          password: connectionSettings.password || undefined,
          tls_validation: connectionSettings.tls_validation,
          ca_cert: connectionSettings.ca_cert || null,
        },
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="edit-remote-title" variant="medium">
      <ModalHeader title={`Edit "${remote.name}"`} labelId="edit-remote-title" />
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
          <FormGroup label="Name" isRequired fieldId="remote-edit-name">
            <TextInput
              id="remote-edit-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="URL" isRequired fieldId="remote-edit-url">
            <TextInput
              id="remote-edit-url"
              isRequired
              type="url"
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Distributions" isRequired fieldId="remote-edit-distributions">
            <TextInput
              id="remote-edit-distributions"
              isRequired
              value={distributions}
              onChange={(_event, value) => setDistributions(value)}
            />
          </FormGroup>
          <FormGroup label="Components" fieldId="remote-edit-components">
            <TextInput
              id="remote-edit-components"
              placeholder="e.g. main contrib"
              value={components}
              onChange={(_event, value) => setComponents(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Whitespace-separated list. Leave blank to sync every component the
                  distribution has.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup label="Architectures" fieldId="remote-edit-architectures">
            <TextInput
              id="remote-edit-architectures"
              placeholder="e.g. amd64 arm64"
              value={architectures}
              onChange={(_event, value) => setArchitectures(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Whitespace-separated list. Leave blank to sync every architecture the
                  Release file lists.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup label="Sync policy" fieldId="remote-edit-policy">
            <FormSelect
              id="remote-edit-policy"
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
            idPrefix="edit-remote"
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
              isDisabled={!name || !url || !distributions || updateMutation.isPending}
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
