import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import type { NpmContent } from "../../../api/client/npm/types";

interface ContentTableProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  content: NpmContent[] | undefined;
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
    return <LoadingState label="Loading packages" />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!content || content.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} variant={emptyStateVariant} />;
  }

  return (
    <Table aria-label="NPM content" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Version</Th>
          <Th>Relative path</Th>
        </Tr>
      </Thead>
      <Tbody>
        {content.map((pkg) => (
          <Tr key={pkg.pulp_href}>
            <Td dataLabel="Name">{pkg.name ?? "—"}</Td>
            <Td dataLabel="Version">{pkg.version ?? "—"}</Td>
            <Td dataLabel="Relative path">
              <code>{pkg.relative_path ?? "—"}</code>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
