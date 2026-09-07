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
import { useUploadCompsMutation } from "./useUploadCompsMutation";

interface UploadCompsModalProps {
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
  onClose: () => void;
}

/** Bulk-creates package groups/categories/environments/langpacks from one
 * comps.xml file - see src/api/client/rpm/compsContent.ts. */
export function UploadCompsModal({
  repositoryHref,
  repositoryName,
  invalidateKeys,
  onClose,
}: UploadCompsModalProps) {
  const [file, setFile] = useState<File | undefined>();
  const [filename, setFilename] = useState("");
  const uploadMutation = useUploadCompsMutation();

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
    <Modal isOpen onClose={onClose} aria-labelledby="upload-comps-title" variant="medium">
      <ModalHeader
        title={`Upload comps.xml to "${repositoryName}"`}
        labelId="upload-comps-title"
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
                  : "Could not upload comps.xml."
              }
            />
          ) : null}
          <FormGroup label="comps.xml file" isRequired fieldId="comps-file">
            <FileUpload
              id="comps-file"
              filename={filename}
              filenamePlaceholder="Drag and drop a comps.xml file, or browse to select one"
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
