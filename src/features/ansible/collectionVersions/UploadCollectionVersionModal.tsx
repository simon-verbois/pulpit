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
import { useUploadCollectionVersionMutation } from "./useUploadCollectionVersionMutation";

interface UploadCollectionVersionModalProps {
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
  onClose: () => void;
}

export function UploadCollectionVersionModal({
  repositoryHref,
  repositoryName,
  invalidateKeys,
  onClose,
}: UploadCollectionVersionModalProps) {
  const [file, setFile] = useState<File | undefined>();
  const [filename, setFilename] = useState("");
  const uploadMutation = useUploadCollectionVersionMutation();

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
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="upload-collection-title"
      variant="medium"
    >
      <ModalHeader
        title={`Upload collection to "${repositoryName}"`}
        labelId="upload-collection-title"
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
                  : "Could not upload the collection."
              }
            />
          ) : null}
          <FormGroup label="Collection tarball" isRequired fieldId="collection-file">
            <FileUpload
              id="collection-file"
              filename={filename}
              filenamePlaceholder="Drag and drop a namespace-name-version.tar.gz file, or browse to select one"
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
