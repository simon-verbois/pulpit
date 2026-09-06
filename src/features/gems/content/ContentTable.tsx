import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import type { GemContent } from "../../../api/client/gem/types";

interface ContentTableProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  content: GemContent[] | undefined;
  emptyTitle: string;
  emptyBody: string;
  /** Set by a repository-detail tab caller (nested in a bigger page) -
   * unset for the equivalent top-level list page, which stays full-page. */
  emptyStateVariant?: "sm";
}

export function ContentTable({
  isPending,
  isError,
  error,
  onRetry,
  content,
  emptyTitle,
  emptyBody,
  emptyStateVariant,
}: ContentTableProps) {
  if (isPending) {
    return <LoadingState label="Loading gems" />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!content || content.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} variant={emptyStateVariant} />;
  }

  return (
    <Table aria-label="Gem content" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Version</Th>
          <Th>Platform</Th>
        </Tr>
      </Thead>
      <Tbody>
        {content.map((gem) => (
          <Tr key={gem.pulp_href}>
            <Td dataLabel="Name">{gem.name ?? "—"}</Td>
            <Td dataLabel="Version">{gem.version ?? "—"}</Td>
            <Td dataLabel="Platform">{gem.platform ?? "—"}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
