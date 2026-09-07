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

import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useCreateFileGitRemoteMutation } from "./useCreateFileGitRemoteMutation";

const EMPTY_CONNECTION_SETTINGS: RemoteConnectionSettings = {
  proxy_url: "",
  proxy_username: "",
  proxy_password: "",
  username: "",
  password: "",
  tls_validation: true,
  ca_cert: "",
};

/** A separate modal, not a variant of CreateRemoteModal - VERIFIED live, a
 * git remote has no `policy` field at all (a clone has no immediate/
 * on_demand/streamed distinction) and adds `git_ref` instead. Unlike RPM's
 * ULN flavor, username/password stay optional here, same as a standard
 * remote - so this still reuses RemoteConnectionSettingsFields. */
export function CreateGitRemoteModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [gitRef, setGitRef] = useState("");
  const [connectionSettings, setConnectionSettings] = useState(EMPTY_CONNECTION_SETTINGS);
  const createMutation = useCreateFileGitRemoteMutation();

  const handleSubmit = () => {
    createMutation.mutate(
      {
        name,
        url,
        git_ref: gitRef || undefined,
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
      aria-labelledby="create-git-remote-title"
      variant="medium"
    >
      <ModalHeader title="Create Git remote" labelId="create-git-remote-title" />
      <ModalBody>
        <Form>
          {createMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                createMutation.error instanceof PulpApiError
                  ? createMutation.error.message
                  : "Could not create the Git remote."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="git-remote-name">
            <TextInput
              id="git-remote-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Git URL" isRequired fieldId="git-remote-url">
            <TextInput
              id="git-remote-url"
              isRequired
              placeholder="https://github.com/example/files.git"
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Git ref" fieldId="git-remote-ref">
            <TextInput
              id="git-remote-ref"
              placeholder="HEAD"
              value={gitRef}
              onChange={(_event, value) => setGitRef(value)}
            />
          </FormGroup>
          <RemoteConnectionSettingsFields
            idPrefix="create-git-remote"
            value={connectionSettings}
            onChange={setConnectionSettings}
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
              isDisabled={!name || !url || createMutation.isPending}
              isLoading={createMutation.isPending}
              onClick={handleSubmit}
            >
              Create
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
