import { useState } from "react";
import {
  Alert,
  Button,
  ExpandableSection,
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
  TextArea,
  TextInput,
} from "@patternfly/react-core";

import type { RemotePolicy } from "../../../api/client/ansible/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useCreateCollectionRemoteMutation } from "./useCreateCollectionRemoteMutation";

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

export function CreateCollectionRemoteModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://galaxy.ansible.com/api/");
  const [policy, setPolicy] = useState<RemotePolicy>("immediate");
  const [requirementsFile, setRequirementsFile] = useState("");
  const [authUrl, setAuthUrl] = useState("");
  const [token, setToken] = useState("");
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);
  const [connectionSettings, setConnectionSettings] = useState(EMPTY_CONNECTION_SETTINGS);
  const createMutation = useCreateCollectionRemoteMutation();

  const handleSubmit = () => {
    createMutation.mutate(
      {
        name,
        url,
        policy,
        requirements_file: requirementsFile || undefined,
        auth_url: authUrl || undefined,
        token: token || undefined,
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
      aria-labelledby="create-collection-remote-title"
      variant="medium"
    >
      <ModalHeader
        title="Create Collection remote"
        labelId="create-collection-remote-title"
      />
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
          <FormGroup label="Name" isRequired fieldId="collection-remote-name">
            <TextInput
              id="collection-remote-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="URL" isRequired fieldId="collection-remote-url">
            <TextInput
              id="collection-remote-url"
              isRequired
              type="url"
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Sync policy" fieldId="collection-remote-policy">
            <FormSelect
              id="collection-remote-policy"
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
          <ExpandableSection
            toggleText={
              isOptionsExpanded
                ? "Hide collection sync options"
                : "Collection sync options"
            }
            isExpanded={isOptionsExpanded}
            onToggle={(_event, expanded) => setIsOptionsExpanded(expanded)}
          >
            <FormGroup label="Requirements file" fieldId="collection-remote-requirements">
              <TextArea
                id="collection-remote-requirements"
                placeholder={"collections:\n  - name: community.general"}
                value={requirementsFile}
                onChange={(_event, value) => setRequirementsFile(value)}
                autoResize
              />
            </FormGroup>
            <FormGroup
              label="Automation Hub token URL"
              fieldId="collection-remote-auth-url"
            >
              <TextInput
                id="collection-remote-auth-url"
                type="url"
                value={authUrl}
                onChange={(_event, value) => setAuthUrl(value)}
              />
            </FormGroup>
            <FormGroup label="Automation Hub token" fieldId="collection-remote-token">
              <TextInput
                id="collection-remote-token"
                type="password"
                autoComplete="new-password"
                value={token}
                onChange={(_event, value) => setToken(value)}
              />
            </FormGroup>
          </ExpandableSection>
          <RemoteConnectionSettingsFields
            idPrefix="create-collection-remote"
            value={connectionSettings}
            onChange={setConnectionSettings}
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
