import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
} from "@patternfly/react-core";

import { pulpFetch } from "../api/client/httpClient";
import {
  listSyncRemotes,
  repositoryKindFromHref,
  syncRepository,
  type RepositoryOperationSource,
  type RepositorySyncOptions,
} from "../api/client/repositoryOperations";
import { useTasksContext } from "../api/tasks/TasksContext";
import { ErrorState } from "./ErrorState";

export function SyncRepositoryModal({
  repositoryHref,
  onClose,
}: {
  repositoryHref: string;
  onClose: () => void;
}) {
  const kind = repositoryKindFromHref(repositoryHref);
  const { registerTask } = useTasksContext();
  const [remote, setRemote] = useState("");
  const [mode, setMode] = useState("default");
  const [optimize, setOptimize] = useState(true);
  const [signedOnly, setSignedOnly] = useState(false);
  const [skipTypes, setSkipTypes] = useState<("srpm" | "treeinfo")[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const repository = useQuery({
    queryKey: ["pulp", "sync-source", repositoryHref],
    queryFn: () => pulpFetch<RepositoryOperationSource>(repositoryHref),
  });
  const remotes = useQuery({
    queryKey: ["pulp", "sync-remotes", kind],
    queryFn: () => listSyncRemotes(kind),
  });
  const isMirror = mode.startsWith("mirror");
  const supportsOptimize = ["rpm", "file", "ansible", "deb"].includes(kind);
  const signingEnabled = Boolean(
    repository.data?.package_signing_service || repository.data?.metadata_signing_service,
  );
  const mutation = useMutation({
    mutationFn: () => {
      const options: RepositorySyncOptions = {};
      if (remote) options.remote = remote;
      if (kind === "rpm") {
        if (mode !== "default")
          options.sync_policy = mode as RepositorySyncOptions["sync_policy"];
        if (skipTypes.length) options.skip_types = skipTypes;
      } else if (mode !== "default") options.mirror = isMirror;
      if (supportsOptimize) options.optimize = optimize;
      if (kind === "container") options.signed_only = signedOnly;
      return syncRepository(repositoryHref, options);
    },
    onSuccess: ({ task }) => {
      registerTask({
        href: task,
        label: `Sync repository "${repository.data?.name ?? kind}"`,
        resourceHrefs: [repositoryHref],
        action: "sync",
        invalidateKeys: [["pulp"]],
      });
      onClose();
    },
  });
  return (
    <Modal isOpen onClose={onClose} aria-labelledby="sync-options-title" variant="medium">
      <ModalHeader title="Synchronize with options" labelId="sync-options-title" />
      <ModalBody>
        <Form onSubmit={(event) => event.preventDefault()}>
          {repository.isError ? (
            <ErrorState error={repository.error} onRetry={() => repository.refetch()} />
          ) : null}
          {remotes.isError ? (
            <ErrorState error={remotes.error} onRetry={() => remotes.refetch()} />
          ) : null}
          {mutation.isError ? <ErrorState error={mutation.error} /> : null}
          <FormGroup label="Remote" fieldId="sync-remote">
            <FormSelect
              id="sync-remote"
              value={remote}
              onChange={(_, value) => setRemote(value)}
              isDisabled={remotes.isPending}
            >
              <FormSelectOption value="" label="Use repository default" />
              {remotes.data?.map((item) => (
                <FormSelectOption
                  key={item.pulp_href}
                  value={item.pulp_href}
                  label={item.label}
                />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Synchronization mode" fieldId="sync-mode">
            <FormSelect
              id="sync-mode"
              value={mode}
              onChange={(_, value) => {
                setMode(value);
                setConfirmed(false);
              }}
            >
              <FormSelectOption value="default" label="Pulp default (additive)" />
              <FormSelectOption
                value="additive"
                label="Add content, preserve existing content"
              />
              {kind === "rpm" ? (
                <>
                  <FormSelectOption
                    value="mirror_content_only"
                    label="Mirror content, regenerate metadata"
                  />
                  <FormSelectOption
                    value="mirror_complete"
                    label="Exact mirror, preserve upstream metadata"
                  />
                </>
              ) : (
                <FormSelectOption value="mirror" label="Mirror remote content" />
              )}
            </FormSelect>
          </FormGroup>
          {kind === "rpm" && signingEnabled ? (
            <Alert
              isInline
              variant="info"
              title="Signing can change package checksums. Use content mirroring when Pulp needs to re-sign upstream packages."
            />
          ) : null}
          {kind === "rpm" && mode === "mirror_complete" ? (
            <Alert
              isInline
              variant="info"
              title="Exact mirroring copies upstream metadata and can create a publication even when autopublish is off."
            />
          ) : null}
          {supportsOptimize ? (
            <Checkbox
              id="sync-optimize"
              label="Optimize unchanged content"
              isChecked={optimize}
              onChange={(_, checked) => setOptimize(checked)}
            />
          ) : null}
          {kind === "rpm"
            ? (["srpm", "treeinfo"] as const).map((type) => (
                <Checkbox
                  key={type}
                  id={`sync-skip-${type}`}
                  label={
                    type === "srpm"
                      ? "Skip source RPMs"
                      : "Skip distribution tree information"
                  }
                  isChecked={skipTypes.includes(type)}
                  onChange={(_, checked) =>
                    setSkipTypes((current) =>
                      checked
                        ? [...current, type]
                        : current.filter((item) => item !== type),
                    )
                  }
                />
              ))
            : null}
          {kind === "container" ? (
            <Checkbox
              id="sync-signed-only"
              label="Synchronize signed content only"
              description="Pulp filters for the presence of signatures; it does not verify their validity."
              isChecked={signedOnly}
              onChange={(_, checked) => setSignedOnly(checked)}
            />
          ) : null}
          {isMirror ? (
            <>
              <Alert
                isInline
                variant="warning"
                title="Mirroring removes repository content that is absent from the remote."
              />
              <Checkbox
                id="sync-confirm-mirror"
                label="I confirm this repository should match the remote"
                isChecked={confirmed}
                onChange={(_, checked) => setConfirmed(checked)}
              />
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
            repository.isPending ||
            repository.isError ||
            (!remote && !repository.data?.remote) ||
            (isMirror && !confirmed)
          }
          onClick={() => mutation.mutate()}
        >
          Synchronize
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
