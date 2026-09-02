import {
  ClipboardCopy,
  ClipboardCopyVariant,
  Content,
  Modal,
  ModalBody,
  ModalHeader,
} from "@patternfly/react-core";

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
        <ClipboardCopy
          isReadOnly
          isCode
          variant={ClipboardCopyVariant.expansion}
          hoverTip="Copy"
          clickTip="Copied"
        >
          {service.public_key}
        </ClipboardCopy>
        <Content component="h3">Signing script (on the Pulp server)</Content>
        <ClipboardCopy
          isReadOnly
          isCode
          variant={ClipboardCopyVariant.expansion}
          hoverTip="Copy"
          clickTip="Copied"
        >
          {service.script}
        </ClipboardCopy>
      </ModalBody>
    </Modal>
  );
}
