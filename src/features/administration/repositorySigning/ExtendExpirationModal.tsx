import { useState } from "react";
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInput,
} from "@patternfly/react-core";

import { PulpApiError } from "../../../api/errors/PulpApiError";
import type { SigningKey } from "../../../api/client/pulpitCore/types";
import { useExtendSigningKeyExpirationMutation } from "./useExtendSigningKeyExpirationMutation";

export function ExtendExpirationModal({
  signingKey,
  onClose,
}: {
  signingKey: SigningKey;
  onClose: () => void;
}) {
  const [days, setDays] = useState(90);
  const mutation = useExtendSigningKeyExpirationMutation();

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="extend-expiration-title"
      variant="small"
    >
      <ModalHeader
        title={`Extend expiration for ${signingKey.identity_name}`}
        labelId="extend-expiration-title"
      />
      <ModalBody>
        <Form>
          {mutation.isError ? (
            <Alert
              variant="danger"
              isInline
              title={
                mutation.error instanceof PulpApiError
                  ? mutation.error.message
                  : "Could not extend the key's expiration."
              }
            />
          ) : null}
          <FormGroup label="Additional days" isRequired fieldId="extend-expiration-days">
            <NumberInput
              id="extend-expiration-days"
              value={days}
              min={1}
              max={3650}
              onMinus={() => setDays((v) => Math.max(1, v - 1))}
              onPlus={() => setDays((v) => Math.min(3650, v + 1))}
              onChange={(event) =>
                setDays(Number((event.target as HTMLInputElement).value))
              }
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
              isDisabled={mutation.isPending}
              isLoading={mutation.isPending}
              onClick={() =>
                mutation.mutate(
                  { keyId: signingKey.id, additionalDays: days },
                  { onSuccess: () => onClose() },
                )
              }
            >
              Extend
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
