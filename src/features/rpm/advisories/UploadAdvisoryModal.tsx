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
import { useUploadRpmAdvisoryMutation } from "./useUploadRpmAdvisoryMutation";

interface UploadAdvisoryModalProps {
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
  onClose: () => void;
}

export function UploadAdvisoryModal({
  repositoryHref,
  repositoryName,
  invalidateKeys,
  onClose,
}: UploadAdvisoryModalProps) {
  const [file, setFile] = useState<File | undefined>();
  const [filename, setFilename] = useState("");
  const uploadMutation = useUploadRpmAdvisoryMutation();

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
      aria-labelledby="upload-advisory-title"
      variant="medium"
    >
      <ModalHeader
        title={`Upload advisory to "${repositoryName}"`}
        labelId="upload-advisory-title"
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
                  : "Could not upload the advisory."
              }
            />
          ) : null}
          <Alert
            variant="info"
            isInline
            isPlain
            title="A JSON document, not updateinfo.xml"
            style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}
          >
            Pulp's advisory upload expects a JSON document with fields like{" "}
            <code>id</code>, <code>title</code>, <code>type</code>, <code>severity</code>,{" "}
            <code>description</code>, <code>pkglist</code>, and <code>references</code> -
            not a raw updateinfo.xml. Syncing a repository whose remote already includes
            advisories is the usual way they get into Pulp.
          </Alert>
          <FormGroup label="Advisory JSON file" isRequired fieldId="advisory-file">
            <FileUpload
              id="advisory-file"
              filename={filename}
              filenamePlaceholder="Drag and drop a .json file, or browse to select one"
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
