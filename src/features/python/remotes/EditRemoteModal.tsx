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
  PythonRemote,
  RemotePolicy,
} from "../../../api/client/python/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import {
  RemoteConnectionSettingsFields,
  type RemoteConnectionSettings,
} from "../../../components/RemoteConnectionSettingsFields";
import { useUpdatePythonRemoteMutation } from "./useUpdatePythonRemoteMutation";

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

export function EditRemoteModal({
  remote,
  onClose,
}: {
  remote: PythonRemote;
  onClose: () => void;
}) {
  const [name, setName] = useState(remote.name);
  const [url, setUrl] = useState(remote.url);
  const [policy, setPolicy] = useState<RemotePolicy>(remote.policy);
  const [includes, setIncludes] = useState((remote.includes ?? []).join(", "));
  const [excludes, setExcludes] = useState((remote.excludes ?? []).join(", "));
  const [prereleases, setPrereleases] = useState(remote.prereleases ?? false);
  const [packageTypes, setPackageTypes] = useState<PythonPackageType[]>(
    remote.package_types ?? [],
  );
  const [excludePlatforms, setExcludePlatforms] = useState<PythonExcludePlatform[]>(
    remote.exclude_platforms ?? [],
  );
  const [keepLatestPackages, setKeepLatestPackages] = useState<number | undefined>(
    remote.keep_latest_packages || undefined,
  );
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [connectionSettings, setConnectionSettings] = useState<RemoteConnectionSettings>({
    username: "",
    password: "",
  });
  const updateMutation = useUpdatePythonRemoteMutation();

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
    updateMutation.mutate(
      {
        href: remote.pulp_href,
        name: remote.name,
        data: {
          name: name !== remote.name ? name : undefined,
          url,
          policy,
          includes: includesList,
          excludes: excludesList,
          prereleases,
          package_types: packageTypes,
          exclude_platforms: excludePlatforms,
          keep_latest_packages: keepLatestPackages ?? 0,
          username: connectionSettings.username || undefined,
          password: connectionSettings.password || undefined,
        },
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="edit-remote-title" variant="medium">
      <ModalHeader title={`Edit "${remote.name}"`} labelId="edit-remote-title" />
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
          <FormGroup label="Name" isRequired fieldId="remote-edit-name">
            <TextInput
              id="remote-edit-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="URL" isRequired fieldId="remote-edit-url">
            <TextInput
              id="remote-edit-url"
              isRequired
              type="url"
              value={url}
              onChange={(_event, value) => setUrl(value)}
            />
          </FormGroup>
          <FormGroup label="Sync policy" fieldId="remote-edit-policy">
            <FormSelect
              id="remote-edit-policy"
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
            <FormGroup label="Include" fieldId="remote-edit-includes">
              <TextInput
                id="remote-edit-includes"
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
            <FormGroup label="Exclude" fieldId="remote-edit-excludes">
              <TextInput
                id="remote-edit-excludes"
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
            <FormGroup fieldId="remote-edit-prereleases">
              <Checkbox
                id="remote-edit-prereleases"
                label="Include pre-release packages"
                isChecked={prereleases}
                onChange={(_event, checked) => setPrereleases(checked)}
              />
            </FormGroup>
            <FormGroup label="Package types" fieldId="remote-edit-package-types">
              <Flex>
                {PACKAGE_TYPES.map((type) => (
                  <FlexItem key={type}>
                    <Checkbox
                      id={`remote-edit-package-type-${type}`}
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
            <FormGroup label="Exclude platforms" fieldId="remote-edit-exclude-platforms">
              <Flex>
                {EXCLUDE_PLATFORMS.map((platform) => (
                  <FlexItem key={platform}>
                    <Checkbox
                      id={`remote-edit-exclude-platform-${platform}`}
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
              fieldId="remote-edit-keep-latest-packages"
            >
              <NumberInput
                id="remote-edit-keep-latest-packages"
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
            idPrefix="edit-remote"
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
