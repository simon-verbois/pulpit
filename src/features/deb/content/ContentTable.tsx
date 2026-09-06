import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import type { DebContent } from "../../../api/client/deb/types";

interface ContentTableProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  content: DebContent[] | undefined;
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
    <Table aria-label="Debian content" variant="compact">
      <Thead>
        <Tr>
          <Th>Package</Th>
          <Th>Version</Th>
          <Th>Architecture</Th>
        </Tr>
      </Thead>
      <Tbody>
        {content.map((pkg) => (
          <Tr key={pkg.pulp_href}>
            <Td dataLabel="Package">{pkg.package ?? "—"}</Td>
            <Td dataLabel="Version">{pkg.version ?? "—"}</Td>
            <Td dataLabel="Architecture">{pkg.architecture ?? "—"}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
