import { useState } from "react";
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
import { useCreateGalaxyNamespaceMutation } from "./useCreateGalaxyNamespaceMutation";

interface CreateNamespaceModalProps {
  distributionBasePath: string;
  onClose: () => void;
}

/** `links` (arbitrary labeled URLs) isn't editable here - multipart encoding
 * of a nested array of objects isn't attempted in this first pass (see
 * src/api/client/ansible/galaxyNamespaces.ts). */
export function CreateNamespaceModal({
  distributionBasePath,
  onClose,
}: CreateNamespaceModalProps) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState<File | undefined>();
  const [avatarFilename, setAvatarFilename] = useState("");
  const createMutation = useCreateGalaxyNamespaceMutation(distributionBasePath);

  const handleSubmit = () => {
    createMutation.mutate(
      { name, company, email, description, avatar },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="create-namespace-title"
      variant="medium"
    >
      <ModalHeader title="Create namespace" labelId="create-namespace-title" />
      <ModalBody>
        <Form>
          {createMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                createMutation.error instanceof PulpApiError
                  ? createMutation.error.message
                  : "Could not create the namespace."
              }
            />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="namespace-name">
            <TextInput
              id="namespace-name"
              isRequired
              placeholder="lowercase_with_underscores"
              value={name}
              onChange={(_event, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup label="Company" fieldId="namespace-company">
            <TextInput
              id="namespace-company"
              value={company}
              onChange={(_event, value) => setCompany(value)}
            />
          </FormGroup>
          <FormGroup label="Email" fieldId="namespace-email">
            <TextInput
              id="namespace-email"
              type="email"
              value={email}
              onChange={(_event, value) => setEmail(value)}
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="namespace-description">
            <TextInput
              id="namespace-description"
              value={description}
              onChange={(_event, value) => setDescription(value)}
            />
          </FormGroup>
          <FormGroup label="Avatar" fieldId="namespace-avatar">
            <FileUpload
              id="namespace-avatar"
              filename={avatarFilename}
              filenamePlaceholder="Drag and drop an image, or browse to select one"
              onFileInputChange={(_event, selectedFile) => {
                setAvatar(selectedFile);
                setAvatarFilename(selectedFile.name);
              }}
              onClearClick={() => {
                setAvatar(undefined);
                setAvatarFilename("");
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
              isDisabled={!name || createMutation.isPending}
              isLoading={createMutation.isPending}
              onClick={handleSubmit}
            >
              Create
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
