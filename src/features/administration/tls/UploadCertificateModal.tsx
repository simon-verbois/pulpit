import { useState } from "react";
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
} from "@patternfly/react-core";

import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useUploadManualCertificateMutation } from "./useUploadManualCertificateMutation";

export function UploadCertificateModal({ onClose }: { onClose: () => void }) {
  const [certPem, setCertPem] = useState("");
  const [keyPem, setKeyPem] = useState("");
  const uploadMutation = useUploadManualCertificateMutation();

  const handleUpload = () => {
    uploadMutation.mutate({ cert_pem: certPem, key_pem: keyPem }, { onSuccess: onClose });
  };

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="upload-cert-title" variant="medium">
      <ModalHeader title="Upload certificate" labelId="upload-cert-title" />
      <ModalBody>
        <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsMd" }}>
          {uploadMutation.isError ? (
            <FlexItem>
              <Alert
                variant="danger"
                isInline
                title={
                  uploadMutation.error instanceof PulpApiError
                    ? uploadMutation.error.message
                    : "Could not install this certificate."
                }
              />
            </FlexItem>
          ) : null}
          <FlexItem>
            <Form>
              <FormGroup label="Certificate (PEM)" isRequired fieldId="upload-cert-pem">
                <TextArea
                  id="upload-cert-pem"
                  rows={8}
                  resizeOrientation="vertical"
                  autoComplete="off"
                  placeholder={
                    "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
                  }
                  value={certPem}
                  onChange={(_event, value) => setCertPem(value)}
                />
              </FormGroup>
              <FormGroup label="Private key (PEM)" isRequired fieldId="upload-key-pem">
                <TextArea
                  id="upload-key-pem"
                  rows={8}
                  resizeOrientation="vertical"
                  autoComplete="off"
                  placeholder={
                    "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                  }
                  value={keyPem}
                  onChange={(_event, value) => setKeyPem(value)}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Unencrypted RSA or EC key only. Never stored anywhere but this
                      instance's own certificate directory - see docs/tls.md.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            </Form>
          </FlexItem>
        </Flex>
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
              isLoading={uploadMutation.isPending}
              isDisabled={uploadMutation.isPending || !certPem.trim() || !keyPem.trim()}
              onClick={handleUpload}
            >
              Install certificate
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
