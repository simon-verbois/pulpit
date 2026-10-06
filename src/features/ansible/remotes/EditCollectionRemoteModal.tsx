import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  ExpandableSection,
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
  NumberInput,
  TextArea,
  TextInput,
} from "@patternfly/react-core";

import type { CollectionRemote, RemotePolicy } from "../../../api/client/ansible/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useUpdateCollectionRemoteMutation } from "./useUpdateCollectionRemoteMutation";

const POLICIES: { value: RemotePolicy; label: string }[] = [
  { value: "immediate", label: "Immediate - download all content now" },
  { value: "on_demand", label: "On demand - download content when requested" },
  { value: "streamed", label: "Streamed - never store content locally" },
];

export function EditCollectionRemoteModal({
  remote,
  onClose,
}: {
  remote: CollectionRemote;
  onClose: () => void;
}) {
  const [name, setName] = useState(remote.name);
  const [url, setUrl] = useState(remote.url);
  const [policy, setPolicy] = useState<RemotePolicy>(remote.policy);
  const [requirementsFile, setRequirementsFile] = useState(
    remote.requirements_file ?? "",
  );
  const [authUrl, setAuthUrl] = useState(remote.auth_url ?? "");
  const [token, setToken] = useState("");
  const [syncDependencies, setSyncDependencies] = useState(remote.sync_dependencies);
  const [signedOnly, setSignedOnly] = useState(remote.signed_only);
  const [syncHighestVersions, setSyncHighestVersions] = useState<number | undefined>(
    remote.sync_highest_versions ?? undefined,
  );
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);
  // proxy/origin/token credentials start blank - Pulp never echoes them back
  // (VERIFIED live, see CollectionRemote.hidden_fields); blank on submit
  // means "leave unchanged", not "clear".
  const [connectionSettings, setConnectionSettings] = useState<RemoteConnectionSettings>({
    username: "",
    password: "",
  });
  const updateMutation = useUpdateCollectionRemoteMutation();
  const tokenIsSet = remote.hidden_fields.find((f) => f.name === "token")?.is_set;

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        href: remote.pulp_href,
        name: remote.name,
        data: {
          name: name !== remote.name ? name : undefined,
          url,
          policy,
          requirements_file: requirementsFile || null,
          auth_url: authUrl || null,
          token: token || undefined,
          sync_dependencies: syncDependencies,
          signed_only: signedOnly,
          sync_highest_versions: syncHighestVersions ?? null,
          username: connectionSettings.username || undefined,
          password: connectionSettings.password || undefined,
        },
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="edit-collection-remote-title"
      variant="medium"
    >
      <ModalHeader
        title={`Edit "${remote.name}"`}
        labelId="edit-collection-remote-title"
      />
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
          <FormGroup label="Name" isRequired fieldId="collection-remote-edit-name">
            <TextInput
              id="collection-remote-edit-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="URL" isRequired fieldId="collection-remote-edit-url">
            <TextInput
              id="collection-remote-edit-url"
              isRequired
              type="url"
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Sync policy" fieldId="collection-remote-edit-policy">
            <FormSelect
              id="collection-remote-edit-policy"
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
            <FormGroup
              label="Requirements file"
              fieldId="collection-remote-edit-requirements"
            >
              <TextArea
                id="collection-remote-edit-requirements"
                value={requirementsFile}
                onChange={(_event, value) => setRequirementsFile(value)}
                autoResize
              />
            </FormGroup>
            <FormGroup
              label="Automation Hub token URL"
              fieldId="collection-remote-edit-auth-url"
            >
              <TextInput
                id="collection-remote-edit-auth-url"
                type="url"
                value={authUrl}
                onChange={(_event, value) => setAuthUrl(value)}
              />
            </FormGroup>
            <FormGroup
              label="Automation Hub token"
              fieldId="collection-remote-edit-token"
            >
              <TextInput
                id="collection-remote-edit-token"
                type="password"
                autoComplete="new-password"
                value={token}
                onChange={(_event, value) => setToken(value)}
              />
              {tokenIsSet ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Currently set - leave blank to keep it, or type a new value to
                      replace it.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              ) : null}
            </FormGroup>
            <FormGroup fieldId="collection-remote-edit-sync-dependencies">
              <Checkbox
                id="collection-remote-edit-sync-dependencies"
                label="Sync dependencies"
                description="Also sync collections listed as dependencies of the ones in the requirements file."
                isChecked={syncDependencies}
                onChange={(_event, checked) => setSyncDependencies(checked)}
              />
            </FormGroup>
            <FormGroup fieldId="collection-remote-edit-signed-only">
              <Checkbox
                id="collection-remote-edit-signed-only"
                label="Signed collections only"
                description="Skip any collection version that doesn't have a signature."
                isChecked={signedOnly}
                onChange={(_event, checked) => setSignedOnly(checked)}
              />
            </FormGroup>
            <FormGroup
              label="Highest versions to sync per collection"
              fieldId="collection-remote-edit-sync-highest-versions"
            >
              <NumberInput
                id="collection-remote-edit-sync-highest-versions"
                value={syncHighestVersions}
                min={1}
                onMinus={() =>
                  setSyncHighestVersions((v) => (v ? Math.max(1, v - 1) : v))
                }
                onPlus={() => setSyncHighestVersions((v) => (v ? v + 1 : 1))}
                onChange={(event) => {
                  const value = Number((event.target as HTMLInputElement).value);
                  setSyncHighestVersions(Number.isNaN(value) ? undefined : value);
                }}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Leave blank to sync every version. 1 syncs only the latest version of
                    each collection.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </ExpandableSection>
          <RemoteConnectionSettingsFields
            idPrefix="edit-collection-remote"
            value={connectionSettings}
            onChange={setConnectionSettings}
            hiddenFields={remote.hidden_fields}
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
