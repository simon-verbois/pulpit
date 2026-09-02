import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";

import type { GitRemote } from "../../../api/client/ansible/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useUpdateGitRemoteMutation } from "./useUpdateGitRemoteMutation";

export function EditGitRemoteModal({
  remote,
  onClose,
}: {
  remote: GitRemote;
  onClose: () => void;
}) {
  const [name, setName] = useState(remote.name);
  const [url, setUrl] = useState(remote.url);
  const [gitRef, setGitRef] = useState(remote.git_ref ?? "");
  const [metadataOnly, setMetadataOnly] = useState(remote.metadata_only);
  const [connectionSettings, setConnectionSettings] = useState<RemoteConnectionSettings>({
    proxy_url: remote.proxy_url ?? "",
    proxy_username: "",
    proxy_password: "",
    username: "",
    password: "",
    tls_validation: remote.tls_validation,
  });
  const updateMutation = useUpdateGitRemoteMutation();

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        href: remote.pulp_href,
        name: remote.name,
        data: {
          name: name !== remote.name ? name : undefined,
          url,
          git_ref: gitRef || null,
          metadata_only: metadataOnly,
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
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="edit-git-remote-title"
      variant="medium"
    >
      <ModalHeader title={`Edit "${remote.name}"`} labelId="edit-git-remote-title" />
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
          <FormGroup label="Name" isRequired fieldId="git-remote-edit-name">
            <TextInput
              id="git-remote-edit-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Git URL" isRequired fieldId="git-remote-edit-url">
            <TextInput
              id="git-remote-edit-url"
              isRequired
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Git ref" fieldId="git-remote-edit-ref">
            <TextInput
              id="git-remote-edit-ref"
              value={gitRef}
              onChange={(_event, value) => setGitRef(value)}
            />
          </FormGroup>
          <FormGroup fieldId="git-remote-edit-metadata-only">
            <Checkbox
              id="git-remote-edit-metadata-only"
              label="Metadata only"
              description="Clients retrieve content directly from the remote URL - Pulp stores only metadata."
              isChecked={metadataOnly}
              onChange={(_event, checked) => setMetadataOnly(checked)}
            />
          </FormGroup>
          <RemoteConnectionSettingsFields
            idPrefix="edit-git-remote"
            value={connectionSettings}
            onChange={setConnectionSettings}
            hiddenFields={remote.hidden_fields}
          />
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={!name || !url || updateMutation.isPending}
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
