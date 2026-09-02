import { useState } from "react";
import {
  Alert,
  Button,
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

import type { ContainerRemote, RemotePolicy } from "../../../api/client/container/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useUpdateContainerRemoteMutation } from "./useUpdateContainerRemoteMutation";

const POLICIES: { value: RemotePolicy; label: string }[] = [
  { value: "immediate", label: "Immediate - download all metadata and content now" },
  { value: "on_demand", label: "On demand - download content when requested" },
  { value: "streamed", label: "Streamed - never store content locally" },
];

export function EditRemoteModal({
  remote,
  onClose,
}: {
  remote: ContainerRemote;
  onClose: () => void;
}) {
  const [name, setName] = useState(remote.name);
  const [url, setUrl] = useState(remote.url);
  const [upstreamName, setUpstreamName] = useState(remote.upstream_name);
  const [policy, setPolicy] = useState<RemotePolicy>(remote.policy);
  const [includeTags, setIncludeTags] = useState((remote.includes ?? []).join(", "));
  // proxy_username/proxy_password/username/password start blank - Pulp
  // never echoes them back (VERIFIED live, see ContainerRemote.hidden_fields);
  // blank on submit means "leave unchanged", not "clear".
  const [connectionSettings, setConnectionSettings] = useState<RemoteConnectionSettings>({
    proxy_url: remote.proxy_url ?? "",
    proxy_username: "",
    proxy_password: "",
    username: "",
    password: "",
    tls_validation: remote.tls_validation,
  });
  const updateMutation = useUpdateContainerRemoteMutation();

  const handleSubmit = () => {
    const includes = includeTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    updateMutation.mutate(
      {
        href: remote.pulp_href,
        name: remote.name,
        data: {
          name: name !== remote.name ? name : undefined,
          url,
          upstream_name: upstreamName,
          policy,
          includes,
          proxy_url: connectionSettings.proxy_url || null,
          proxy_username: connectionSettings.proxy_username || undefined,
          proxy_password: connectionSettings.proxy_password || undefined,
          username: connectionSettings.username || undefined,
          password: connectionSettings.password || undefined,
          tls_validation: connectionSettings.tls_validation,
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
          <FormGroup label="Registry URL" isRequired fieldId="remote-edit-url">
            <TextInput
              id="remote-edit-url"
              isRequired
              type="url"
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup
            label="Upstream image name"
            isRequired
            fieldId="remote-edit-upstream-name"
          >
            <TextInput
              id="remote-edit-upstream-name"
              isRequired
              value={upstreamName}
              onChange={(_event, value) => setUpstreamName(value)}
            />
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
          <FormGroup label="Include tags" fieldId="remote-edit-include-tags">
            <TextInput
              id="remote-edit-include-tags"
              placeholder="e.g. latest, v1.*"
              value={includeTags}
              onChange={(_event, value) => setIncludeTags(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Comma-separated glob patterns - limits sync to matching tags instead of
                  every tag the upstream image has. Empty means every tag.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
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
        <Button
          variant="primary"
          isDisabled={!name || !url || !upstreamName || updateMutation.isPending}
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
