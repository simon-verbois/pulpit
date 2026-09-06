import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import type { FileContent } from "../../../api/client/file/types";

interface ContentTableProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  content: FileContent[] | undefined;
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
    return <LoadingState label="Loading files" />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!content || content.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} variant={emptyStateVariant} />;
  }

  return (
    <Table aria-label="File content" variant="compact">
      <Thead>
        <Tr>
          <Th>Relative path</Th>
          <Th>SHA256</Th>
        </Tr>
      </Thead>
      <Tbody>
        {content.map((file) => (
          <Tr key={file.pulp_href}>
            <Td dataLabel="Relative path">
              <code>{file.relative_path}</code>
            </Td>
            <Td dataLabel="SHA256">
              <code>{file.sha256 ?? "—"}</code>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
