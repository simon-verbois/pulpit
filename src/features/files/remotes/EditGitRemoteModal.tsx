import { useState } from "react";
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";

import type { FileGitRemote } from "../../../api/client/file/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useUpdateFileGitRemoteMutation } from "./useUpdateFileGitRemoteMutation";

export function EditGitRemoteModal({
  remote,
  onClose,
}: {
  remote: FileGitRemote;
  onClose: () => void;
}) {
  const [name, setName] = useState(remote.name);
  const [url, setUrl] = useState(remote.url);
  const [gitRef, setGitRef] = useState(remote.git_ref);
  const [connectionSettings, setConnectionSettings] = useState<RemoteConnectionSettings>({
    proxy_url: remote.proxy_url ?? "",
    proxy_username: "",
    proxy_password: "",
    username: "",
    password: "",
    tls_validation: remote.tls_validation,
    ca_cert: remote.ca_cert ?? "",
  });
  const updateMutation = useUpdateFileGitRemoteMutation();

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        href: remote.pulp_href,
        name: remote.name,
        data: {
          name: name !== remote.name ? name : undefined,
          url,
          git_ref: gitRef,
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
                  : "Could not update the Git remote."
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
          <RemoteConnectionSettingsFields
            idPrefix="edit-git-remote"
            value={connectionSettings}
            onChange={setConnectionSettings}
            hiddenFields={remote.hidden_fields}
          />
        </Form>
      </ModalBody>
      <ModalFooter>
        <Flex justifyContent={{ default: "justifyContentFlexEnd" }} style={{ width: "100%" }}>
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
