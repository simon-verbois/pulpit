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

import type { GalaxyNamespace } from "../../../api/client/ansible/types";
import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useUpdateGalaxyNamespaceMutation } from "./useUpdateGalaxyNamespaceMutation";

interface EditNamespaceModalProps {
  namespace: GalaxyNamespace;
  distributionBasePath: string;
  onClose: () => void;
}

export function EditNamespaceModal({
  namespace,
  distributionBasePath,
  onClose,
}: EditNamespaceModalProps) {
  const [company, setCompany] = useState(namespace.company);
  const [email, setEmail] = useState(namespace.email);
  const [description, setDescription] = useState(namespace.description);
  const [avatar, setAvatar] = useState<File | undefined>();
  const [avatarFilename, setAvatarFilename] = useState("");
  const updateMutation = useUpdateGalaxyNamespaceMutation(distributionBasePath);

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        name: namespace.name,
        resourceHref: namespace.pulp_href,
        data: { company, email, description, avatar },
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="edit-namespace-title"
      variant="medium"
    >
      <ModalHeader title={`Edit "${namespace.name}"`} labelId="edit-namespace-title" />
      <ModalBody>
        <Form>
          {updateMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                updateMutation.error instanceof PulpApiError
                  ? updateMutation.error.message
                  : "Could not update the namespace."
              }
            />
          ) : null}
          <FormGroup label="Company" fieldId="namespace-edit-company">
            <TextInput
              id="namespace-edit-company"
              value={company}
              onChange={(_event, value) => setCompany(value)}
            />
          </FormGroup>
          <FormGroup label="Email" fieldId="namespace-edit-email">
            <TextInput
              id="namespace-edit-email"
              type="email"
              value={email}
              onChange={(_event, value) => setEmail(value)}
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="namespace-edit-description">
            <TextInput
              id="namespace-edit-description"
              value={description}
              onChange={(_event, value) => setDescription(value)}
            />
          </FormGroup>
          <FormGroup label="Avatar" fieldId="namespace-edit-avatar">
            <FileUpload
              id="namespace-edit-avatar"
              filename={avatarFilename}
              filenamePlaceholder={
                namespace.avatar_url
                  ? "Currently set - upload a file to replace it"
                  : "Drag and drop an image, or browse to select one"
              }
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
              isDisabled={updateMutation.isPending}
              isLoading={updateMutation.isPending}
              onClick={handleSubmit}
            >
              Save
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
