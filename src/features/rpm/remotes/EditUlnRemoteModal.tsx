import { useState } from "react";
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";

import type { RpmUlnRemote } from "../../../api/client/rpm/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useUpdateUlnRemoteMutation } from "./useUpdateUlnRemoteMutation";

function credentialHint(remote: RpmUlnRemote, field: "username" | "password") {
  return remote.hidden_fields.find((item) => item.name === field)?.is_set
    ? "Currently set - leave blank to keep it, or type a new value to replace it."
    : "Enter a value to configure it.";
}

export function EditUlnRemoteModal({
  remote,
  onClose,
}: {
  remote: RpmUlnRemote;
  onClose: () => void;
}) {
  const [name, setName] = useState(remote.name);
  const [url, setUrl] = useState(remote.url);
  const [ulnServerBaseUrl, setUlnServerBaseUrl] = useState(remote.uln_server_base_url);
  // Pulp only reports whether these write-only fields are set. Blank values
  // are omitted from PATCH so opening and saving cannot erase credentials.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const updateMutation = useUpdateUlnRemoteMutation();

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        href: remote.pulp_href,
        name: remote.name,
        data: {
          name: name !== remote.name ? name : undefined,
          url,
          uln_server_base_url: ulnServerBaseUrl,
          username: username || undefined,
          password: password || undefined,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="edit-uln-remote-title"
      variant="medium"
    >
      <ModalHeader title={`Edit "${remote.name}"`} labelId="edit-uln-remote-title" />
      <ModalBody>
        <Form>
          {updateMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                updateMutation.error instanceof PulpApiError
                  ? updateMutation.error.message
                  : "Could not update the ULN remote."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="uln-remote-edit-name">
            <TextInput
              id="uln-remote-edit-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Channel URL" isRequired fieldId="uln-remote-edit-url">
            <TextInput
              id="uln-remote-edit-url"
              isRequired
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup
            label="ULN server base URL"
            isRequired
            fieldId="uln-remote-edit-server-base-url"
          >
            <TextInput
              id="uln-remote-edit-server-base-url"
              isRequired
              type="url"
              value={ulnServerBaseUrl}
              onChange={(_event, value) => setUlnServerBaseUrl(value)}
            />
          </FormGroup>
          <FormGroup label="ULN username" fieldId="uln-remote-edit-username">
            <TextInput
              id="uln-remote-edit-username"
              autoComplete="off"
              value={username}
              onChange={(_event, value) => setUsername(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{credentialHint(remote, "username")}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup label="ULN password" fieldId="uln-remote-edit-password">
            <TextInput
              id="uln-remote-edit-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(_event, value) => setPassword(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{credentialHint(remote, "password")}</HelperTextItem>
              </HelperText>
            </FormHelperText>
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
              isDisabled={!name || !url || !ulnServerBaseUrl || updateMutation.isPending}
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
