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

import type { RemotePolicy } from "../../../api/client/hugging_face/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useCreateHuggingFaceRemoteMutation } from "./useCreateHuggingFaceRemoteMutation";

const POLICIES: { value: RemotePolicy; label: string }[] = [
  { value: "immediate", label: "Immediate - download all content now" },
  { value: "on_demand", label: "On demand - download content when requested" },
  { value: "streamed", label: "Streamed - never store content locally" },
];

const EMPTY_CONNECTION_SETTINGS: RemoteConnectionSettings = {
  username: "",
  password: "",
};

export function CreateRemoteModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [policy, setPolicy] = useState<RemotePolicy>("immediate");
  const [hfHubUrl, setHfHubUrl] = useState("");
  const [hfToken, setHfToken] = useState("");
  const [connectionSettings, setConnectionSettings] = useState(EMPTY_CONNECTION_SETTINGS);
  const createMutation = useCreateHuggingFaceRemoteMutation();

  const handleSubmit = () => {
    createMutation.mutate(
      {
        name,
        url,
        policy,
        username: connectionSettings.username || undefined,
        password: connectionSettings.password || undefined,
        // Both optional and plugin-specific (not part of the generic
        // RemoteConnectionSettingsFields shared by every plugin) - for
        // pointing at a self-hosted/private Hugging Face Hub instead of
        // the public huggingface.co.
        ...(hfHubUrl ? { hf_hub_url: hfHubUrl } : {}),
        ...(hfToken ? { hf_token: hfToken } : {}),
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="create-remote-title"
      variant="medium"
    >
      <ModalHeader title="Create Hugging Face remote" labelId="create-remote-title" />
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
          <FormGroup label="Name" isRequired fieldId="remote-name">
            <TextInput
              id="remote-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="URL" isRequired fieldId="remote-url">
            <TextInput
              id="remote-url"
              isRequired
              type="url"
              placeholder="https://huggingface.co/bert-base-uncased"
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Sync policy" fieldId="remote-policy">
            <FormSelect
              id="remote-policy"
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
          <FormGroup label="Hub URL" fieldId="remote-hf-hub-url">
            <TextInput
              id="remote-hf-hub-url"
              type="url"
              placeholder="https://huggingface.co"
              value={hfHubUrl}
              onChange={(_event, value) => setHfHubUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Hub token" fieldId="remote-hf-token">
            <TextInput
              id="remote-hf-token"
              type="password"
              autoComplete="new-password"
              placeholder="Only needed for private/gated repos"
              value={hfToken}
              onChange={(_event, value) => setHfToken(value)}
            />
          </FormGroup>
          <RemoteConnectionSettingsFields
            idPrefix="create-remote"
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
