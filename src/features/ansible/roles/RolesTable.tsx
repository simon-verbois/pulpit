import type { ReactNode } from "react";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { RepositoryMembershipCell } from "../../../components/RepositoryMembershipCell";
import type { RepositoryKind } from "../../../api/client/repositoryMembership";
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
  /** Rendered as the empty state's own call to action - used by callers
   * whose toolbar action (e.g. "Upload role") is hidden while the list is
   * empty, so the empty state stays the sole CTA. */
  emptyAction?: ReactNode;
  repositoryKind?: RepositoryKind;
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
  emptyAction,
  repositoryKind,
}: RolesTableProps) {
  if (isPending) {
    return <LoadingState label="Loading roles" />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!roles || roles.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        body={emptyBody}
        variant={emptyStateVariant}
        action={emptyAction}
      />
    );
  }

  return (
    <Table aria-label="Ansible roles" variant="compact">
      <Thead>
        <Tr>
          <Th>Namespace</Th>
          <Th>Name</Th>
          <Th>Version</Th>
          {repositoryKind ? <Th>Repositories</Th> : null}
        </Tr>
      </Thead>
      <Tbody>
        {roles.map((role) => (
          <Tr key={role.pulp_href}>
            <Td dataLabel="Namespace">{role.namespace}</Td>
            <Td dataLabel="Name">{role.name}</Td>
            <Td dataLabel="Version">{role.version}</Td>
            {repositoryKind ? (
              <Td dataLabel="Repositories">
                <RepositoryMembershipCell
                  contentHref={role.pulp_href}
                  repositoryKind={repositoryKind}
                />
              </Td>
            ) : null}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
