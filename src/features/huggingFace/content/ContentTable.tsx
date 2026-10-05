import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { RepositoryMembershipCell } from "../../../components/RepositoryMembershipCell";
import type { RepositoryKind } from "../../../api/client/repositoryMembership";
import type { HuggingFaceContent } from "../../../api/client/hugging_face/types";

interface ContentTableProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  content: HuggingFaceContent[] | undefined;
  emptyTitle: string;
  emptyBody: string;
  /** Set by a repository-detail tab caller (nested in a bigger page) -
   * unset for the equivalent top-level list page, which stays full-page. */
  emptyStateVariant?: "sm";
  repositoryKind?: RepositoryKind;
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
  repositoryKind,
}: ContentTableProps) {
  if (isPending) {
    return (
      <LoadingState
        columns={[
          "Relative path",
          "Hub repo",
          "Type",
          ...(repositoryKind ? ["Repositories"] : []),
        ]}
        label="Loading files"
      />
    );
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!content || content.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} variant={emptyStateVariant} />;
  }

  return (
    <Table aria-label="Hugging Face content" variant="compact">
      <Thead>
        <Tr>
          <Th>Relative path</Th>
          <Th>Hub repo</Th>
          <Th>Type</Th>
          {repositoryKind ? <Th>Repositories</Th> : null}
        </Tr>
      </Thead>
      <Tbody>
        {content.map((file) => (
          <Tr key={file.pulp_href}>
            <Td dataLabel="Relative path">
              <code>{file.relative_path}</code>
            </Td>
            <Td dataLabel="Hub repo">{file.repo_id}</Td>
            <Td dataLabel="Type">{file.repo_type ?? "—"}</Td>
            {repositoryKind ? (
              <Td dataLabel="Repositories">
                <RepositoryMembershipCell
                  contentHref={file.pulp_href}
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
