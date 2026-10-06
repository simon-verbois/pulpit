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

import type { RemotePolicy } from "../../../api/client/deb/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useCreateDebRemoteMutation } from "./useCreateDebRemoteMutation";

const POLICIES: { value: RemotePolicy; label: string }[] = [
  { value: "immediate", label: "Immediate - download all content now" },
  { value: "on_demand", label: "On demand - download content when requested" },
  { value: "streamed", label: "Streamed - never store content locally" },
];

const EMPTY_CONNECTION_SETTINGS: RemoteConnectionSettings = {
  username: "",
  password: "",
};

/** Unlike every other plugin's remote in this app, this one has a second
 * REQUIRED field - VERIFIED live: `distributions`, a whitespace-separated
 * list of release codenames/suites (e.g. "bookworm") to sync. pulp_deb has
 * no way to sync without knowing which distribution(s) to fetch. */
export function CreateRemoteModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [distributions, setDistributions] = useState("");
  const [components, setComponents] = useState("");
  const [architectures, setArchitectures] = useState("");
  const [policy, setPolicy] = useState<RemotePolicy>("immediate");
  const [connectionSettings, setConnectionSettings] = useState(EMPTY_CONNECTION_SETTINGS);
  const createMutation = useCreateDebRemoteMutation();

  const handleSubmit = () => {
    createMutation.mutate(
      {
        name,
        url,
        distributions,
        components: components || undefined,
        architectures: architectures || undefined,
        policy,
        username: connectionSettings.username || undefined,
        password: connectionSettings.password || undefined,
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
      <ModalHeader title="Create Debian remote" labelId="create-remote-title" />
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
              placeholder="http://deb.debian.org/debian"
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Distributions" isRequired fieldId="remote-distributions">
            <TextInput
              id="remote-distributions"
              isRequired
              placeholder="e.g. bookworm"
              value={distributions}
              onChange={(_event, value) => setDistributions(value)}
            />
          </FormGroup>
          <FormGroup label="Components" fieldId="remote-components">
            <TextInput
              id="remote-components"
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
          <FormGroup label="Architectures" fieldId="remote-architectures">
            <TextInput
              id="remote-architectures"
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
              isDisabled={!name || !url || !distributions || createMutation.isPending}
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
