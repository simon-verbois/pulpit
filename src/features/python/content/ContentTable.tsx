import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import type { PythonContent } from "../../../api/client/python/types";

interface ContentTableProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  content: PythonContent[] | undefined;
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
    <Table aria-label="Python content" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Version</Th>
          <Th>Type</Th>
          <Th>Filename</Th>
        </Tr>
      </Thead>
      <Tbody>
        {content.map((pkg) => (
          <Tr key={pkg.pulp_href}>
            <Td dataLabel="Name">{pkg.name ?? "—"}</Td>
            <Td dataLabel="Version">{pkg.version ?? "—"}</Td>
            <Td dataLabel="Type">{pkg.packagetype ?? "—"}</Td>
            <Td dataLabel="Filename">
              <code>{pkg.filename ?? "—"}</code>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
