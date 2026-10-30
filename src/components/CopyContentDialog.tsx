import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
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
} from "@patternfly/react-core";
import type { CopyKind } from "../api/client/contentSelection";
import { ContentSelectionTable } from "./ContentSelectionTable";
import { ErrorState } from "./ErrorState";

export interface CopySelection {
  mode: "all" | "selected" | "tags" | "manifests";
  values: string[];
  mediaTypes: string[];
  dependencySolving: boolean;
  dependencyUpgrade: boolean;
}
export interface CopyDialogArgs {
  sourceRepositoryVersionHref: string;
  destRepositoryHref: string;
  destRepositoryName: string;
  selection?: CopySelection;
}
export interface CopyDialogProps {
  sourceRepositoryHref: string;
  sourceRepositoryVersionHref: string;
  onClose: () => void;
}

const MEDIA_TYPES = [
  "application/vnd.docker.distribution.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.v2+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.oci.image.index.v1+json",
];

export function CopyContentDialog({
  kind,
  loadRepositories,
  copy,
  isPending,
  error,
  sourceRepositoryHref,
  sourceRepositoryVersionHref,
  onClose,
}: CopyDialogProps & {
  kind: CopyKind;
  loadRepositories: () => Promise<{ pulp_href: string; name: string }[]>;
  copy: (args: CopyDialogArgs) => Promise<unknown>;
  isPending: boolean;
  error?: unknown;
}) {
  const [destination, setDestination] = useState("");
  const [selection, setSelection] = useState<CopySelection>({
    mode: "all",
    values: [],
    mediaTypes: [],
    dependencySolving: true,
    dependencyUpgrade: false,
  });
  const repositories = useQuery({
    queryKey: ["pulp", kind, "repositories", "all"],
    queryFn: loadRepositories,
  });
  const candidates = (repositories.data ?? []).filter(
    (item) => item.pulp_href !== sourceRepositoryHref,
  );
  const selective = selection.mode !== "all";
  const validSelection =
    !selective ||
    selection.values.length > 0 ||
    (selection.mode === "manifests" && selection.mediaTypes.length > 0);
  const selectMode = (mode: CopySelection["mode"]) =>
    setSelection((current) => ({ ...current, mode, values: [], mediaTypes: [] }));
  return (
    <Modal isOpen onClose={onClose} aria-labelledby="copy-content-title" variant="large">
      <ModalHeader
        title="Copy content to another repository"
        labelId="copy-content-title"
      />
      <ModalBody>
        <Form onSubmit={(event) => event.preventDefault()}>
          {error ? <ErrorState error={error} /> : null}
          {repositories.isError ? (
            <ErrorState
              error={repositories.error}
              onRetry={() => repositories.refetch()}
            />
          ) : null}
          <FormGroup
            label="Destination repository"
            isRequired
            fieldId="copy-dest-repository"
          >
            <FormSelect
              id="copy-dest-repository"
              value={destination}
              onChange={(_, value) => setDestination(value)}
              isDisabled={repositories.isPending}
            >
              <FormSelectOption value="" label="Select a repository…" />
              {candidates.map((item) => (
                <FormSelectOption
                  key={item.pulp_href}
                  value={item.pulp_href}
                  label={item.name}
                />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Copy" fieldId="copy-scope">
            <Radio
              id="copy-all"
              name="copy-scope"
              label="All content in this version"
              isChecked={!selective}
              onChange={() => selectMode("all")}
            />
            {kind === "container" ? (
              <>
                <Radio
                  id="copy-tags"
                  name="copy-scope"
                  label="Selected tags"
                  isChecked={selection.mode === "tags"}
                  onChange={() => selectMode("tags")}
                />
                <Radio
                  id="copy-manifests"
                  name="copy-scope"
                  label="Selected manifests or media types"
                  isChecked={selection.mode === "manifests"}
                  onChange={() => selectMode("manifests")}
                />
              </>
            ) : (
              <Radio
                id="copy-selected"
                name="copy-scope"
                label="Selected content"
                isChecked={selective}
                onChange={() => selectMode("selected")}
              />
            )}
          </FormGroup>
          {selective ? (
            <ContentSelectionTable
              kind={kind}
              versionHref={sourceRepositoryVersionHref}
              selection={selection.values}
              onChange={(values) => setSelection((current) => ({ ...current, values }))}
              fixedType={kind === "container" ? selection.mode : undefined}
            />
          ) : null}
          {kind === "container" && selection.mode === "manifests" ? (
            <FormGroup label="Media type filters">
              <p>
                Without selected digests, all manifests matching these types are copied.
              </p>
              {MEDIA_TYPES.map((type, index) => (
                <Checkbox
                  key={type}
                  id={`copy-media-${index}`}
                  label={type}
                  isChecked={selection.mediaTypes.includes(type)}
                  onChange={(_, checked) =>
                    setSelection((current) => ({
                      ...current,
                      mediaTypes: checked
                        ? [...current.mediaTypes, type]
                        : current.mediaTypes.filter((item) => item !== type),
                    }))
                  }
                />
              ))}
            </FormGroup>
          ) : null}
          {kind === "rpm" ? (
            <>
              <Checkbox
                id="copy-dependencies"
                label="Include dependencies"
                isChecked={selection.dependencySolving}
                onChange={(_, checked) =>
                  setSelection((current) => ({ ...current, dependencySolving: checked }))
                }
              />
              <Checkbox
                id="copy-upgrade-dependencies"
                label="Prefer the latest compatible dependency versions"
                isChecked={selection.dependencyUpgrade}
                isDisabled={!selection.dependencySolving}
                onChange={(_, checked) =>
                  setSelection((current) => ({ ...current, dependencyUpgrade: checked }))
                }
              />
            </>
          ) : null}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isLoading={isPending}
          isDisabled={
            isPending || !destination || !validSelection || repositories.isError
          }
          onClick={async () => {
            const dest = candidates.find((item) => item.pulp_href === destination);
            if (!dest) return;
            try {
              await copy({
                sourceRepositoryVersionHref,
                destRepositoryHref: dest.pulp_href,
                destRepositoryName: dest.name,
                selection,
              });
              onClose();
            } catch {
              /* The mutation error is rendered above; accepted tasks remain tracked. */
            }
          }}
        >
          Copy
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
