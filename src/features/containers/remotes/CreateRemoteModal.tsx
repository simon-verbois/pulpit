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

import type { RemotePolicy } from "../../../api/client/container/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useCreateContainerRemoteMutation } from "./useCreateContainerRemoteMutation";

const POLICIES: { value: RemotePolicy; label: string }[] = [
  { value: "immediate", label: "Immediate - download all metadata and content now" },
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

export function CreateRemoteModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [upstreamName, setUpstreamName] = useState("");
  const [policy, setPolicy] = useState<RemotePolicy>("immediate");
  const [includeTags, setIncludeTags] = useState("");
  const [excludeTags, setExcludeTags] = useState("");
  const [connectionSettings, setConnectionSettings] = useState(EMPTY_CONNECTION_SETTINGS);
  const createMutation = useCreateContainerRemoteMutation();

  const handleSubmit = () => {
    const includes = includeTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const excludes = excludeTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    createMutation.mutate(
      {
        name,
        url,
        upstream_name: upstreamName,
        policy,
        includes: includes.length > 0 ? includes : undefined,
        excludes: excludes.length > 0 ? excludes : undefined,
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
      aria-labelledby="create-remote-title"
      variant="medium"
    >
      <ModalHeader title="Create container remote" labelId="create-remote-title" />
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
          <FormGroup label="Registry URL" isRequired fieldId="remote-url">
            <TextInput
              id="remote-url"
              isRequired
              type="url"
              placeholder="https://registry.hub.docker.com"
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup
            label="Upstream image name"
            isRequired
            fieldId="remote-upstream-name"
          >
            <TextInput
              id="remote-upstream-name"
              isRequired
              placeholder="e.g. library/busybox"
              value={upstreamName}
              onChange={(_event, value) => setUpstreamName(value)}
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
          <FormGroup label="Include tags" fieldId="remote-include-tags">
            <TextInput
              id="remote-include-tags"
              placeholder="e.g. latest, v1.*"
              value={includeTags}
              onChange={(_event, value) => setIncludeTags(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Comma-separated glob patterns - limits sync to matching tags instead of
                  every tag the upstream image has (some registries rate-limit large
                  syncs). Evaluated before "Exclude tags".
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup label="Exclude tags" fieldId="remote-exclude-tags">
            <TextInput
              id="remote-exclude-tags"
              placeholder="e.g. *-rc, nightly"
              value={excludeTags}
              onChange={(_event, value) => setExcludeTags(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Comma-separated glob patterns - tags matching these are skipped, even if
                  they also match "Include tags".
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
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
              isDisabled={!name || !url || !upstreamName || createMutation.isPending}
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
