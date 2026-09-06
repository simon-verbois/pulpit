import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";

interface ConfirmDeleteModalProps {
  /** The specific object being deleted, named explicitly per docs/UX.md
   * "Destructive actions" - never a generic "are you sure?". */
  itemLabel: string;
  itemTypeLabel: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** An extra, more severe consequence beyond "this item is gone" - e.g. a
   * cascade delete of something else the user might not expect. Rendered as
   * a prominent inline warning above the normal confirmation text. */
  warning?: string;
}

export function ConfirmDeleteModal({
  itemLabel,
  itemTypeLabel,
  isDeleting,
  onConfirm,
  onCancel,
  warning,
}: ConfirmDeleteModalProps) {
  return (
    <Modal
      isOpen
      onClose={onCancel}
      aria-labelledby="confirm-delete-title"
      variant="small"
    >
      <ModalHeader title={`Delete ${itemTypeLabel}?`} labelId="confirm-delete-title" />
      <ModalBody>
        {warning ? (
          <Alert
            variant="warning"
            isInline
            title={warning}
            style={{ marginBottom: "1rem" }}
          />
        ) : null}
        Are you sure you want to delete <strong>{itemLabel}</strong>? This cannot be
        undone.
      </ModalBody>
      <ModalFooter>
        <Flex justifyContent={{ default: "justifyContentFlexEnd" }} style={{ width: "100%" }}>
          <FlexItem>
            <Button variant="link" onClick={onCancel}>
              Cancel
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="danger"
              isLoading={isDeleting}
              isDisabled={isDeleting}
              onClick={onConfirm}
            >
              Delete
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
