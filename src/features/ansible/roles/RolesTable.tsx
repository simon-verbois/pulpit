import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import type { AnsibleRole } from "../../../api/client/ansible/types";

interface RolesTableProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  roles: AnsibleRole[] | undefined;
  emptyTitle: string;
  emptyBody: string;
  /** Set by a repository-detail tab caller (nested in a bigger page) -
   * unset for the equivalent top-level list page, which stays full-page. */
  emptyStateVariant?: "sm";
}

export function RolesTable({
  isPending,
  isError,
  error,
  onRetry,
  roles,
  emptyTitle,
  emptyBody,
  emptyStateVariant,
}: RolesTableProps) {
  if (isPending) {
    return <LoadingState label="Loading roles" />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!roles || roles.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} variant={emptyStateVariant} />;
  }

  return (
    <Table aria-label="Ansible roles" variant="compact">
      <Thead>
        <Tr>
          <Th>Namespace</Th>
          <Th>Name</Th>
          <Th>Version</Th>
        </Tr>
      </Thead>
      <Tbody>
        {roles.map((role) => (
          <Tr key={role.pulp_href}>
            <Td dataLabel="Namespace">{role.namespace}</Td>
            <Td dataLabel="Name">{role.name}</Td>
            <Td dataLabel="Version">{role.version}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
