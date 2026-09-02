import { Modal, ModalBody, ModalHeader } from "@patternfly/react-core";

import { ObjectAccessTab } from "../../access/ObjectAccessTab";

/** An RBAC content guard's `users`/`groups` are managed via the exact same
 * generic add_role/remove_role/list_roles actions every RBAC-protected
 * object exposes (VERIFIED live - see docs/PULP_API.md "Administration
 * endpoints"), so this just reuses the same ObjectAccessTab built for
 * Repository "Access" tabs (Milestone 5) rather than duplicating that UI. */
export function ManageContentGuardAccessModal({
  guardHref,
  guardName,
  onClose,
}: {
  guardHref: string;
  guardName: string;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="manage-content-guard-access-title"
      variant="large"
    >
      <ModalHeader
        title={`Access - "${guardName}"`}
        labelId="manage-content-guard-access-title"
      />
      <ModalBody>
        <ObjectAccessTab objectHref={guardHref} objectLabel={`"${guardName}"`} />
      </ModalBody>
    </Modal>
  );
}
