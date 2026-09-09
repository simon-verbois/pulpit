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
  TextInput,
} from "@patternfly/react-core";

import type {
  PythonExcludePlatform,
  PythonPackageType,
  RemotePolicy,
} from "../../../api/client/python/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useCreatePythonRemoteMutation } from "./useCreatePythonRemoteMutation";

const POLICIES: { value: RemotePolicy; label: string }[] = [
  { value: "immediate", label: "Immediate - download all content now" },
  { value: "on_demand", label: "On demand - download content when requested" },
  { value: "streamed", label: "Streamed - never store content locally" },
];

const PACKAGE_TYPES: PythonPackageType[] = [
  "bdist_wheel",
  "sdist",
  "bdist_egg",
  "bdist_rpm",
  "bdist_dmg",
  "bdist_dumb",
  "bdist_msi",
  "bdist_wininst",
];

const EXCLUDE_PLATFORMS: PythonExcludePlatform[] = [
  "linux",
  "windows",
  "macos",
  "freebsd",
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
  const [policy, setPolicy] = useState<RemotePolicy>("immediate");
  const [includes, setIncludes] = useState("");
  const [excludes, setExcludes] = useState("");
  const [prereleases, setPrereleases] = useState(false);
  const [packageTypes, setPackageTypes] = useState<PythonPackageType[]>([]);
  const [excludePlatforms, setExcludePlatforms] = useState<PythonExcludePlatform[]>([]);
  const [keepLatestPackages, setKeepLatestPackages] = useState<number | undefined>(
    undefined,
  );
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [connectionSettings, setConnectionSettings] = useState(EMPTY_CONNECTION_SETTINGS);
  const createMutation = useCreatePythonRemoteMutation();

  const toggleInList = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const handleSubmit = () => {
    const includesList = includes
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const excludesList = excludes
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    createMutation.mutate(
      {
        name,
        url,
        policy,
        includes: includesList.length > 0 ? includesList : undefined,
        excludes: excludesList.length > 0 ? excludesList : undefined,
        prereleases,
        package_types: packageTypes.length > 0 ? packageTypes : undefined,
        exclude_platforms: excludePlatforms.length > 0 ? excludePlatforms : undefined,
        keep_latest_packages: keepLatestPackages,
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
      <ModalHeader title="Create Python remote" labelId="create-remote-title" />
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
              placeholder="https://pypi.org/simple/"
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
          <ExpandableSection
            toggleText={isFiltersExpanded ? "Hide sync filters" : "Sync filters"}
            isExpanded={isFiltersExpanded}
            onToggle={(_event, expanded) => setIsFiltersExpanded(expanded)}
          >
            <FormGroup label="Include" fieldId="remote-includes">
              <TextInput
                id="remote-includes"
                placeholder="e.g. django>=4,<5, requests"
                value={includes}
                onChange={(_event, value) => setIncludes(value)}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Comma-separated project specifiers - limits sync to matching projects
                    instead of the full index. Evaluated before "Exclude". Leave blank to
                    include every project.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup label="Exclude" fieldId="remote-excludes">
              <TextInput
                id="remote-excludes"
                placeholder="e.g. django-debug-toolbar"
                value={excludes}
                onChange={(_event, value) => setExcludes(value)}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Comma-separated project specifiers - skipped even if they also match
                    "Include".
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup fieldId="remote-prereleases">
              <Checkbox
                id="remote-prereleases"
                label="Include pre-release packages"
                isChecked={prereleases}
                onChange={(_event, checked) => setPrereleases(checked)}
              />
            </FormGroup>
            <FormGroup label="Package types" fieldId="remote-package-types">
              <Flex>
                {PACKAGE_TYPES.map((type) => (
                  <FlexItem key={type}>
                    <Checkbox
                      id={`remote-package-type-${type}`}
                      label={type}
                      isChecked={packageTypes.includes(type)}
                      onChange={() => setPackageTypes((prev) => toggleInList(prev, type))}
                    />
                  </FlexItem>
                ))}
              </Flex>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Leave every box unchecked to sync every package type.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup label="Exclude platforms" fieldId="remote-exclude-platforms">
              <Flex>
                {EXCLUDE_PLATFORMS.map((platform) => (
                  <FlexItem key={platform}>
                    <Checkbox
                      id={`remote-exclude-platform-${platform}`}
                      label={platform}
                      isChecked={excludePlatforms.includes(platform)}
                      onChange={() =>
                        setExcludePlatforms((prev) => toggleInList(prev, platform))
                      }
                    />
                  </FlexItem>
                ))}
              </Flex>
            </FormGroup>
            <FormGroup
              label="Keep latest versions per package"
              fieldId="remote-keep-latest-packages"
            >
              <NumberInput
                id="remote-keep-latest-packages"
                value={keepLatestPackages}
                min={1}
                onMinus={() => setKeepLatestPackages((v) => (v ? Math.max(1, v - 1) : v))}
                onPlus={() => setKeepLatestPackages((v) => (v ? v + 1 : 1))}
                onChange={(event) => {
                  const value = Number((event.target as HTMLInputElement).value);
                  setKeepLatestPackages(Number.isNaN(value) ? undefined : value);
                }}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Leave blank to keep every version. 1 keeps only the latest version of
                    each package.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </ExpandableSection>
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
