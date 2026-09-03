import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  TextInput,
} from "@patternfly/react-core";

import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useJob } from "../../../api/client/pulpitCore/useJob";
import { trustedCaCertificatesKey } from "./queryKeys";
import { useCreateTrustedCaCertificateMutation } from "./useCreateTrustedCaCertificateMutation";

export function AddTrustedCaCertificateModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [pem, setPem] = useState("");
  const createMutation = useCreateTrustedCaCertificateMutation();
  const job = useJob(createMutation.data?.id);
  const queryClient = useQueryClient();

  const jobFailed = job.data?.status === "failed";
  const jobSucceeded = job.data?.status === "success";

  const handleAdd = () => {
    createMutation.mutate(
      { name, pem },
      {
        onSuccess: () => {
          // The certificate itself already exists (the job only syncs it
          // into Pulp's trust store) - refetch now so the list shows the
          // new PENDING row immediately, not just once the job settles.
          void queryClient.invalidateQueries({ queryKey: trustedCaCertificatesKey });
        },
      },
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="add-trusted-ca-title"
      variant="medium"
    >
      <ModalHeader title="Add CA certificate" labelId="add-trusted-ca-title" />
      <ModalBody>
        <Form>
          {createMutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                createMutation.error instanceof PulpApiError
                  ? createMutation.error.message
                  : "Could not queue this certificate."
              }
            />
          ) : null}
          {jobFailed ? (
            <Alert
              variant="danger"
              isInline
              title="Could not apply this certificate to Pulp"
            >
              {job.data?.error}
            </Alert>
          ) : null}
          {jobSucceeded ? (
            <Alert variant="success" isInline title="Applied to Pulp's trust store" />
          ) : null}
          <FormGroup label="Name" isRequired fieldId="trusted-ca-name">
            <TextInput
              id="trusted-ca-name"
              isRequired
              placeholder="corp-proxy"
              isDisabled={createMutation.isPending}
              value={name}
              onChange={(_event, value) => setName(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Letters, digits, "_" and "-" only - used as this certificate's filename
                  in Pulp's own trust store.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup label="Certificate (PEM)" isRequired fieldId="trusted-ca-pem">
            <TextArea
              id="trusted-ca-pem"
              isRequired
              rows={12}
              resizeOrientation="vertical"
              placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
              isDisabled={createMutation.isPending}
              value={pem}
              onChange={(_event, value) => setPem(value)}
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
              {jobSucceeded ? "Close" : "Cancel"}
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="primary"
              isDisabled={!name || !pem || createMutation.isPending || jobSucceeded}
              isLoading={
                createMutation.isPending ||
                job.data?.status === "queued" ||
                job.data?.status === "running"
              }
              onClick={handleAdd}
            >
              Add
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
