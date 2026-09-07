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
} from "@patternfly/react-core";

import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useUploadGemContentMutation } from "./useUploadGemContentMutation";

interface UploadContentModalProps {
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
  onClose: () => void;
}

/** No relative path or extra identity fields here - VERIFIED live, a gem's
 * name/version/platform come entirely from its own embedded metadata,
 * parsed server-side from the uploaded .gem file. */
export function UploadContentModal({
  repositoryHref,
  repositoryName,
  invalidateKeys,
  onClose,
}: UploadContentModalProps) {
  const [file, setFile] = useState<File | undefined>();
  const [filename, setFilename] = useState("");
  const uploadMutation = useUploadGemContentMutation();

  const handleSubmit = () => {
    if (!file) {
      return;
    }
    uploadMutation.mutate(
      { file, repositoryHref, repositoryName, invalidateKeys },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="upload-gem-title" variant="medium">
      <ModalHeader
        title={`Upload gem to "${repositoryName}"`}
        labelId="upload-gem-title"
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
                  : "Could not upload the gem."
              }
            />
          ) : null}
          <FormGroup label="File" isRequired fieldId="content-file">
            <FileUpload
              id="content-file"
              filename={filename}
              filenamePlaceholder="Drag and drop a .gem file, or browse to select one"
              onFileInputChange={(_event, selectedFile) => {
                setFile(selectedFile);
                setFilename(selectedFile.name);
              }}
              onClearClick={() => {
                setFile(undefined);
                setFilename("");
              }}
              hideDefaultPreview
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
              isDisabled={!file || uploadMutation.isPending}
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
