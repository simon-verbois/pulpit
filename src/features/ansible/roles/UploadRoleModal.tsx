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
import { useUploadAnsibleRoleMutation } from "./useUploadAnsibleRoleMutation";

interface UploadRoleModalProps {
  repositoryHref: string;
  repositoryName: string;
  invalidateKeys: QueryKey[];
  onClose: () => void;
}

export function UploadRoleModal({
  repositoryHref,
  repositoryName,
  invalidateKeys,
  onClose,
}: UploadRoleModalProps) {
  const [file, setFile] = useState<File | undefined>();
  const [filename, setFilename] = useState("");
  const [name, setName] = useState("");
  const [namespace, setNamespace] = useState("");
  const [version, setVersion] = useState("");
  const uploadMutation = useUploadAnsibleRoleMutation();

  const handleSubmit = () => {
    if (!file) {
      return;
    }
    uploadMutation.mutate(
      { file, name, namespace, version, repositoryHref, invalidateKeys },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="upload-role-title" variant="medium">
      <ModalHeader
        title={`Upload role to "${repositoryName}"`}
        labelId="upload-role-title"
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
                  : "Could not upload the role."
              }
            />
          ) : null}
          <FormGroup label="Namespace" isRequired fieldId="role-namespace">
            <TextInput
              id="role-namespace"
              isRequired
              value={namespace}
              onChange={(_event, value) => setNamespace(value)}
            />
          </FormGroup>
          <FormGroup label="Name" isRequired fieldId="role-name">
            <TextInput
              id="role-name"
              isRequired
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Version" isRequired fieldId="role-version">
            <TextInput
              id="role-version"
              isRequired
              value={version}
              onChange={(_event, value) => setVersion(value)}
            />
          </FormGroup>
          <FormGroup label="Role tarball" isRequired fieldId="role-file">
            <FileUpload
              id="role-file"
              filename={filename}
              filenamePlaceholder="Drag and drop a role tarball, or browse to select one"
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
              isDisabled={
                !file || !name || !namespace || !version || uploadMutation.isPending
              }
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
