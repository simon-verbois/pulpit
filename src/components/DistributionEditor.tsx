import { useSaveDistribution } from "../features/distributions/useSaveDistribution";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Radio,
  TextInput,
} from "@patternfly/react-core";

import {
  listDistributionPublications,
  listDistributionVersions,
  publicationCollection,
  type DistributionSummary,
} from "../api/client/distributionManagement";
import type { RepositoryKind } from "../api/client/repositoryMembership";
import { listSyncRemotes } from "../api/client/repositoryOperations";
import {
  buildDistributionBasePath,
  distributionPathPrefix,
} from "../api/distributions/basePath";
import { useContentOrigin } from "../hooks/useContentOrigin";
import { BasePathField } from "./BasePathField";
import {
  DistributionOptionsFields,
  type DistributionOptions,
} from "./DistributionOptionsFields";
import { ErrorState } from "./ErrorState";

export interface DistributionEditorProps {
  kind: RepositoryKind;
  repositoryHref: string;
  repositoryName: string;
  initial?: DistributionSummary;
  onClose: () => void;
}
type Target = "latest" | "version" | "publication";

/** Common distribution targeting and recovery, using each plugin's native API. */
export function DistributionEditor({
  kind,
  repositoryHref,
  repositoryName,
  initial,
  onClose,
}: DistributionEditorProps) {
  const origin = useContentOrigin();
  const prefix = distributionPathPrefix(kind);
  const fullPath =
    kind === "rpm" || Boolean(initial && !initial.base_path.startsWith(prefix));
  const [path, setPath] = useState(
    initial
      ? fullPath
        ? initial.base_path
        : initial.base_path.slice(prefix.length)
      : "",
  );
  const [customName, setCustomName] = useState<string | undefined>(initial?.name);
  const name = (customName ?? path).trim();
  const basePath = (fullPath ? path : buildDistributionBasePath(kind, path)).trim();
  const [target, setTarget] = useState<Target>(
    initial?.publication
      ? "publication"
      : initial?.repository_version
        ? "version"
        : "latest",
  );
  const [version, setVersion] = useState(initial?.repository_version ?? "");
  const [publication, setPublication] = useState(initial?.publication ?? "");
  const [options, setOptions] = useState<DistributionOptions>({
    content_guard: initial?.content_guard ?? "",
    hidden: initial?.hidden ?? false,
  });
  const [isPrivate, setIsPrivate] = useState(initial?.private ?? false);
  const [checkpoint, setCheckpoint] = useState(initial?.checkpoint ?? false);
  const [allowUploads, setAllowUploads] = useState(initial?.allow_uploads ?? false);
  const [generateConfig, setGenerateConfig] = useState(
    initial?.generate_repo_config ?? false,
  );
  const [remote, setRemote] = useState(initial?.remote ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [recovery, setRecovery] = useState<{ href: string; key: string }>();
  const publicationBase = publicationCollection(kind);
  const supportsRemote = ["maven", "npm", "python", "gem", "huggingFace"].includes(kind);
  const versions = useQuery({
    queryKey: ["pulp", "distribution-versions", repositoryHref],
    queryFn: () => listDistributionVersions(repositoryHref),
    enabled: target === "version",
  });
  const publications = useQuery({
    queryKey: ["pulp", "distribution-publications", kind, repositoryHref],
    queryFn: () => listDistributionPublications(kind, repositoryHref),
    enabled: target === "publication",
  });
  const remotes = useQuery({
    queryKey: ["pulp", "sync-remotes", kind],
    queryFn: () => listSyncRemotes(kind),
    enabled: supportsRemote,
  });
  const selectedVersion = version || versions.data?.[0]?.pulp_href || "";
  const selectedPublication = publication || publications.data?.[0]?.pulp_href || "";

  const { mutation, stage, reconnecting } = useSaveDistribution({
    kind,
    repositoryHref,
    repositoryName,
    initial,
    recovery,
    onSuccess: onClose,
    draft: {
      name,
      basePath,
      target,
      selectedVersion,
      selectedPublication,
      options,
      isPrivate,
      checkpoint,
      allowUploads,
      generateConfig,
      remote,
      description,
    },
    onRecover: (distribution, key) => {
      setRecovery({ href: distribution.pulp_href, key });
      setOptions({
        content_guard: distribution.content_guard ?? "",
        hidden: distribution.hidden ?? false,
      });
      setIsPrivate(distribution.private ?? false);
      setCheckpoint(distribution.checkpoint ?? false);
    },
  });

  return (
    <Modal
      isOpen
      onClose={mutation.isPending ? undefined : onClose}
      aria-labelledby="distribution-editor-title"
      variant="medium"
    >
      <ModalHeader
        title={
          initial
            ? `Edit distribution "${initial.name}"`
            : `Create distribution for "${repositoryName}"`
        }
        labelId="distribution-editor-title"
      />
      <ModalBody>
        <Form onSubmit={(event) => event.preventDefault()}>
          {mutation.isError ? <ErrorState error={mutation.error} /> : null}
          {reconnecting ? (
            <Alert isInline variant="info" title="Reconnect the unused distribution?">
              Its old repository was removed. Confirm to reuse this distribution and its
              URL. Its access settings are preserved below.
            </Alert>
          ) : null}
          {mutation.isPending ? <Alert isInline variant="info" title={stage} /> : null}
          <FormGroup label="Name" isRequired fieldId="distribution-name">
            <TextInput
              id="distribution-name"
              value={name}
              onChange={(_, value) => setCustomName(value)}
            />
          </FormGroup>
          <FormGroup label="Base path" isRequired fieldId="distribution-base-path">
            <BasePathField
              id="distribution-base-path"
              isRequired
              prefix={`${kind === "container" ? window.location.host : `${origin}/pulp/content`}/${fullPath ? "" : prefix}`}
              value={path}
              onChange={setPath}
              placeholder="my-repository"
            />
          </FormGroup>
          <FormGroup label="Content target" fieldId="distribution-target">
            <Radio
              id="distribution-latest"
              name="distribution-target"
              label={
                publicationBase
                  ? "Follow the repository's latest publication"
                  : "Follow the repository's latest version"
              }
              isChecked={target === "latest"}
              onChange={() => setTarget("latest")}
            />
            <Radio
              id="distribution-version"
              name="distribution-target"
              label="Pin a repository version"
              isChecked={target === "version"}
              onChange={() => setTarget("version")}
            />
            {publicationBase ? (
              <Radio
                id="distribution-publication"
                name="distribution-target"
                label="Use an existing publication"
                isChecked={target === "publication"}
                onChange={() => setTarget("publication")}
              />
            ) : null}
          </FormGroup>
          {target === "version" ? (
            <>
              <FormGroup label="Repository version" fieldId="distribution-version-select">
                <FormSelect
                  id="distribution-version-select"
                  value={selectedVersion}
                  onChange={(_, value) => setVersion(value)}
                  isDisabled={versions.isPending}
                >
                  {versions.data?.map((item) => (
                    <FormSelectOption
                      key={item.pulp_href}
                      value={item.pulp_href}
                      label={`Version ${item.number}`}
                    />
                  ))}
                </FormSelect>
              </FormGroup>
              {versions.isError ? (
                <ErrorState error={versions.error} onRetry={() => versions.refetch()} />
              ) : null}
              {versions.isSuccess && !versions.data.length ? (
                <Alert
                  isInline
                  variant="warning"
                  title="This repository has no retained version to publish."
                />
              ) : null}
            </>
          ) : null}
          {target === "publication" ? (
            <>
              <FormGroup label="Publication" fieldId="distribution-publication-select">
                <FormSelect
                  id="distribution-publication-select"
                  value={selectedPublication}
                  onChange={(_, value) => setPublication(value)}
                  isDisabled={publications.isPending}
                >
                  {publication &&
                  !publications.data?.some((item) => item.pulp_href === publication) ? (
                    <FormSelectOption value={publication} label="Current publication" />
                  ) : null}
                  {publications.data?.map((item) => (
                    <FormSelectOption
                      key={item.pulp_href}
                      value={item.pulp_href}
                      label={`Version ${item.repository_version.split("/").filter(Boolean).at(-1)} · ${item.pulp_created ?? item.pulp_href}`}
                    />
                  ))}
                </FormSelect>
              </FormGroup>
              {publications.isError ? (
                <ErrorState
                  error={publications.error}
                  onRetry={() => publications.refetch()}
                />
              ) : null}
            </>
          ) : null}
          <DistributionOptionsFields
            value={options}
            onChange={setOptions}
            registry={kind === "container"}
          />
          {kind === "container" ? (
            <>
              <Checkbox
                id="distribution-private"
                label="Private"
                description="Require registry authentication to pull content."
                isChecked={isPrivate}
                onChange={(_, checked) => setIsPrivate(checked)}
              />
              <FormGroup label="Description" fieldId="distribution-description">
                <TextInput
                  id="distribution-description"
                  value={description}
                  onChange={(_, value) => setDescription(value)}
                />
              </FormGroup>
            </>
          ) : null}
          {kind === "python" ? (
            <Checkbox
              id="distribution-allow-uploads"
              label="Allow uploads through this distribution"
              isChecked={allowUploads}
              onChange={(_, checked) => setAllowUploads(checked)}
            />
          ) : null}
          {kind === "rpm" ? (
            <Checkbox
              id="distribution-generate-config"
              label="Generate repository configuration"
              isChecked={generateConfig}
              onChange={(_, checked) => setGenerateConfig(checked)}
            />
          ) : null}
          {["rpm", "file", "deb"].includes(kind) ? (
            <Checkbox
              id="distribution-checkpoint"
              label="Serve checkpoint publications"
              description="Use timestamped checkpoint paths. Publish checkpoints before enabling this option."
              isChecked={checkpoint}
              onChange={(_, checked) => setCheckpoint(checked)}
            />
          ) : null}
          {supportsRemote ? (
            <>
              <FormGroup label="Pull-through remote" fieldId="distribution-remote">
                <FormSelect
                  id="distribution-remote"
                  value={remote}
                  onChange={(_, value) => setRemote(value)}
                >
                  <FormSelectOption value="" label="None" />
                  {remotes.data?.map((item) => (
                    <FormSelectOption
                      key={item.pulp_href}
                      value={item.pulp_href}
                      label={item.name}
                    />
                  ))}
                </FormSelect>
              </FormGroup>
              {remotes.isError ? (
                <ErrorState error={remotes.error} onRetry={() => remotes.refetch()} />
              ) : null}
            </>
          ) : null}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isLoading={mutation.isPending}
          isDisabled={
            mutation.isPending ||
            !name ||
            !path.trim() ||
            (target === "version" && (!selectedVersion || versions.isError)) ||
            (target === "publication" && (!selectedPublication || publications.isError))
          }
          onClick={() => mutation.mutate()}
        >
          {initial ? "Save" : reconnecting ? "Reconnect" : "Create"}
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={mutation.isPending}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
