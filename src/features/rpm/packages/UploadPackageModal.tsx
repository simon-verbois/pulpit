import { useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Content,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  MultipleFileUpload,
  MultipleFileUploadMain,
} from "@patternfly/react-core";

import { ErrorState } from "../../../components/ErrorState";
import {
  useUploadRpmPackageMutation,
  type PackageUploadState,
} from "./useUploadRpmPackageMutation";

interface UploadPackageModalProps {
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
  onClose: () => void;
}

interface UploadEntry {
  file: File;
  state: PackageUploadState;
}

const phaseLabels = {
  queued: "Ready to upload",
  uploading: "Uploading…",
  adding: "Waiting for repository submission…",
  submitted: "Submitted — follow signing and repository updates in Tasks",
  error: "Failed",
};

export function UploadPackageModal({
  repositoryHref,
  repositoryName,
  invalidateKeys,
  onClose,
}: UploadPackageModalProps) {
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);
  const uploadMutation = useUploadRpmPackageMutation();
  const pendingFiles = entries.filter((entry) => entry.state.phase !== "submitted");
  const hasErrors = entries.some((entry) => entry.state.phase === "error");

  const handleSubmit = () => {
    if (!pendingFiles.length || uploadMutation.isPending) return;
    uploadMutation.mutate(
      {
        files: pendingFiles.map((entry) => entry.file),
        repositoryHref,
        repositoryName,
        invalidateKeys,
        onFileState: (file, state) =>
          setEntries((current) =>
            current.map((entry) => (entry.file === file ? { file, state } : entry)),
          ),
      },
      {
        onSuccess: ({ allSubmitted }) => {
          if (allSubmitted) onClose();
        },
      },
    );
  };

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!uploadMutation.isPending) onClose();
      }}
      aria-labelledby="upload-package-title"
      variant="medium"
    >
      <ModalHeader
        title={`Upload packages to "${repositoryName}"`}
        labelId="upload-package-title"
      />
      <ModalBody>
        <Form onSubmit={(event) => event.preventDefault()}>
          <FormGroup label="RPM files" isRequired fieldId="package-files">
            <MultipleFileUpload
              id="package-files"
              dropzoneProps={{
                accept: { "application/x-rpm": [".rpm"] },
                multiple: true,
                disabled: uploadMutation.isPending,
                onDrop: (_, rejections) =>
                  setRejectedFiles(rejections.map(({ file }) => file.name)),
              }}
              onFileDrop={(_, files) => {
                setEntries((current) => {
                  const combined = [...current];
                  for (const file of files) {
                    if (
                      !combined.some(
                        (entry) =>
                          entry.file.name === file.name &&
                          entry.file.size === file.size &&
                          entry.file.lastModified === file.lastModified,
                      )
                    )
                      combined.push({ file, state: { phase: "queued" } });
                  }
                  return combined;
                });
              }}
            >
              <MultipleFileUploadMain
                titleText="Drag and drop RPM files here"
                titleTextSeparator="or"
                browseButtonText="Browse files"
                isUploadButtonHidden={uploadMutation.isPending}
                infoText="Select one or more .rpm files. Pulp validates each package."
              />
            </MultipleFileUpload>
          </FormGroup>
          {rejectedFiles.length ? (
            <Alert isInline variant="danger" title="Select .rpm files only">
              {rejectedFiles.join(", ")}
            </Alert>
          ) : null}
          {entries.length ? (
            <List isPlain aria-label="Selected RPM files">
              {entries.map(({ file, state }) => (
                <ListItem key={`${file.name}:${file.size}:${file.lastModified}`}>
                  <Flex alignItems={{ default: "alignItemsCenter" }}>
                    <FlexItem grow={{ default: "grow" }}>
                      <Content component="p" style={{ overflowWrap: "anywhere" }}>
                        {file.name}
                      </Content>
                      <span role="status">{phaseLabels[state.phase]}</span>
                    </FlexItem>
                    {state.phase !== "submitted" ? (
                      <FlexItem>
                        <Button
                          variant="link"
                          isInline
                          aria-label={`Remove ${file.name}`}
                          isDisabled={uploadMutation.isPending}
                          onClick={() =>
                            setEntries((current) =>
                              current.filter((entry) => entry.file !== file),
                            )
                          }
                        >
                          Remove
                        </Button>
                      </FlexItem>
                    ) : null}
                  </Flex>
                  {state.phase === "error" ? <ErrorState error={state.error} /> : null}
                </ListItem>
              ))}
            </List>
          ) : null}
          <Content component="p">
            Uploaded packages are added together. Follow the task to confirm signing and
            repository completion.
          </Content>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={!pendingFiles.length || uploadMutation.isPending}
          isLoading={uploadMutation.isPending}
          onClick={handleSubmit}
        >
          {hasErrors ? "Retry failed files" : "Upload"}
        </Button>
        <Button variant="link" isDisabled={uploadMutation.isPending} onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
