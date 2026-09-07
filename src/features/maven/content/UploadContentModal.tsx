import { useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import {
  Alert,
  Button,
  FileUpload,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";

import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useUploadMavenContentMutation } from "./useUploadMavenContentMutation";

interface UploadContentModalProps {
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
  onClose: () => void;
}

export function UploadContentModal({
  repositoryHref,
  repositoryName,
  invalidateKeys,
  onClose,
}: UploadContentModalProps) {
  const [file, setFile] = useState<File | undefined>();
  const [filename, setFilename] = useState("");
  const [relativePath, setRelativePath] = useState("");
  const uploadMutation = useUploadMavenContentMutation();

  const handleSubmit = () => {
    if (!file || !relativePath) {
      return;
    }
    uploadMutation.mutate(
      { file, relativePath, repositoryHref, repositoryName, invalidateKeys },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="upload-artifact-title"
      variant="medium"
    >
      <ModalHeader
        title={`Upload artifact to "${repositoryName}"`}
        labelId="upload-artifact-title"
      />
      <ModalBody>
        <Form>
          {uploadMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                uploadMutation.error instanceof PulpApiError
                  ? uploadMutation.error.message
                  : "Could not upload the artifact."
              }
            />
          ) : null}
          <FormGroup label="File" isRequired fieldId="content-file">
            <FileUpload
              id="content-file"
              filename={filename}
              filenamePlaceholder="Drag and drop a file, or browse to select one"
              onFileInputChange={(_event, selectedFile) => {
                setFile(selectedFile);
                setFilename(selectedFile.name);
                if (!relativePath) {
                  setRelativePath(selectedFile.name);
                }
              }}
              onClearClick={() => {
                setFile(undefined);
                setFilename("");
              }}
              hideDefaultPreview
            />
          </FormGroup>
          <FormGroup label="Relative path" isRequired fieldId="content-relative-path">
            <TextInput
              id="content-relative-path"
              isRequired
              placeholder="e.g. com/example/my-lib/1.0/my-lib-1.0.jar"
              value={relativePath}
              onChange={(_event, value) => setRelativePath(value)}
            />
          </FormGroup>
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
              isDisabled={!file || !relativePath || uploadMutation.isPending}
              isLoading={uploadMutation.isPending}
              onClick={handleSubmit}
            >
              Upload
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
