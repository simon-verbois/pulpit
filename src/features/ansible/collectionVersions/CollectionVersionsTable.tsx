import { Label } from "@patternfly/react-core";
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
}

export function CollectionVersionsTable({
  isPending,
  isError,
  error,
  onRetry,
  collectionVersions,
  emptyTitle,
  emptyBody,
}: CollectionVersionsTableProps) {
  if (isPending) {
    return <LoadingState label="Loading collections" />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!collectionVersions || collectionVersions.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
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
              {cv.tags.length > 0
                ? cv.tags.map((tag) => (
                    <Label
                      key={tag.name}
                      isCompact
                      style={{ marginInlineEnd: "0.25rem" }}
                    >
                      {tag.name}
                    </Label>
                  ))
                : "—"}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
