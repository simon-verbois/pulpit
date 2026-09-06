import { Button } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { formatRelativeTime } from "../../../lib/relativeTime";
import type { ContainerTag } from "../../../api/client/container/types";

interface TagsTableProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  tags: ContainerTag[] | undefined;
  emptyTitle: string;
  emptyBody: string;
  /** Set by a repository-detail tab caller (nested in a bigger page) -
   * unset for the equivalent top-level list page, which stays full-page. */
  emptyStateVariant?: "sm";
  /** Present only on a repository-scoped tab (RepositoryTagsTab) - the
   * global Tags page (mirroring RPM's global Packages page) is read-only. */
  onUntag?: (tag: ContainerTag) => void;
}

export function TagsTable({
  isPending,
  isError,
  error,
  onRetry,
  tags,
  emptyTitle,
  emptyBody,
  emptyStateVariant,
  onUntag,
}: TagsTableProps) {
  if (isPending) {
    return <LoadingState label="Loading tags" />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!tags || tags.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} variant={emptyStateVariant} />;
  }

  return (
    <Table aria-label="Container tags" variant="compact">
      <Thead>
        <Tr>
          <Th>Tag</Th>
          <Th>Created</Th>
          {onUntag ? <Th screenReaderText="Actions" /> : null}
        </Tr>
      </Thead>
      <Tbody>
        {tags.map((tag) => (
          <Tr key={tag.pulp_href}>
            <Td dataLabel="Tag">{tag.name}</Td>
            <Td dataLabel="Created">{formatRelativeTime(tag.pulp_created)}</Td>
            {onUntag ? (
              <Td dataLabel="Actions" isActionCell>
                <Button variant="link" isDanger onClick={() => onUntag(tag)}>
                  Remove
                </Button>
              </Td>
            ) : null}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
