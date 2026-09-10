import type { ReactNode } from "react";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import type { CollectionVersion } from "../../../api/client/ansible/types";

interface CollectionVersionsTableProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  collectionVersions: CollectionVersion[] | undefined;
  emptyTitle: string;
  emptyBody: string;
  /** Set by a repository-detail tab caller (nested in a bigger page) -
   * unset for the equivalent top-level list page, which stays full-page. */
  emptyStateVariant?: "sm";
  /** Rendered as the empty state's own call to action - used by callers
   * whose toolbar action (e.g. "Upload collection") is hidden while the
   * list is empty, so the empty state stays the sole CTA. */
  emptyAction?: ReactNode;
}

export function CollectionVersionsTable({
  isPending,
  isError,
  error,
  onRetry,
  collectionVersions,
  emptyTitle,
  emptyBody,
  emptyStateVariant,
  emptyAction,
}: CollectionVersionsTableProps) {
  if (isPending) {
    return <LoadingState label="Loading collections" />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!collectionVersions || collectionVersions.length === 0) {
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
    <Table aria-label="Collection versions" variant="compact">
      <Thead>
        <Tr>
          <Th>Namespace</Th>
          <Th>Name</Th>
          <Th>Version</Th>
          <Th>Tags</Th>
        </Tr>
      </Thead>
      <Tbody>
        {collectionVersions.map((cv) => (
          <Tr key={cv.pulp_href}>
            <Td dataLabel="Namespace">{cv.namespace}</Td>
            <Td dataLabel="Name">{cv.name}</Td>
            <Td dataLabel="Version">{cv.version}</Td>
            <Td dataLabel="Tags">
              {cv.tags.length > 0 ? cv.tags.map((tag) => tag.name).join(", ") : "—"}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
