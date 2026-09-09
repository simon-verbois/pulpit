import { Content, Modal, ModalBody, ModalHeader } from "@patternfly/react-core";

import type { SigningService } from "../../../api/client/administration/types";

export function ViewSigningServiceModal({
  service,
  onClose,
}: {
  service: SigningService;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="view-signing-service-title"
      variant="large"
    >
      <ModalHeader title={service.name} labelId="view-signing-service-title" />
      <ModalBody>
        <Content component="h3">Public key</Content>
        <pre style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
          <code>{service.public_key}</code>
        </pre>
        <Content component="h3">Signing script (on the Pulp server)</Content>
        <pre style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
          <code>{service.script}</code>
        </pre>
      </ModalBody>
    </Modal>
  );
}
