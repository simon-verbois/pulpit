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
import { useCreateUlnRemoteMutation } from "./useCreateUlnRemoteMutation";

/** A separate modal, not a variant of CreateRemoteModal - VERIFIED live,
 * ULN genuinely requires different fields (username/password are
 * mandatory here, only optional advanced settings on a standard remote). */
export function CreateUlnRemoteModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [ulnServerBaseUrl, setUlnServerBaseUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const createMutation = useCreateUlnRemoteMutation();

  const isValid = name && url && ulnServerBaseUrl && username && password;

  const handleSubmit = () => {
    createMutation.mutate(
      { name, url, uln_server_base_url: ulnServerBaseUrl, username, password },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="create-uln-remote-title"
      variant="medium"
    >
      <ModalHeader title="Create ULN remote" labelId="create-uln-remote-title" />
      <ModalBody>
        <Form>
          {createMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                createMutation.error instanceof PulpApiError
                  ? createMutation.error.message
                  : "Could not create the ULN remote."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="uln-remote-name">
            <TextInput
              id="uln-remote-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Channel URL" isRequired fieldId="uln-remote-url">
            <TextInput
              id="uln-remote-url"
              isRequired
              placeholder="uln://el7_x86_64_oracle_ksplice"
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup
            label="ULN server base URL"
            isRequired
            fieldId="uln-remote-server-base-url"
          >
            <TextInput
              id="uln-remote-server-base-url"
              isRequired
              type="url"
              placeholder="https://linux-update.oracle.com/"
              value={ulnServerBaseUrl}
              onChange={(_event, value) => setUlnServerBaseUrl(value)}
            />
          </FormGroup>
          <FormGroup label="ULN username" isRequired fieldId="uln-remote-username">
            <TextInput
              id="uln-remote-username"
              isRequired
              autoComplete="off"
              value={username}
              onChange={(_event, value) => setUsername(value)}
            />
          </FormGroup>
          <FormGroup label="ULN password" isRequired fieldId="uln-remote-password">
            <TextInput
              id="uln-remote-password"
              isRequired
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(_event, value) => setPassword(value)}
            />
          </FormGroup>
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
              isDisabled={!isValid || createMutation.isPending}
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
