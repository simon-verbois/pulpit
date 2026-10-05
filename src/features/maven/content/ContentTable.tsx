import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { RepositoryMembershipCell } from "../../../components/RepositoryMembershipCell";
import type { RepositoryKind } from "../../../api/client/repositoryMembership";
import type { MavenContent } from "../../../api/client/maven/types";

interface ContentTableProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  content: MavenContent[] | undefined;
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
          "Group ID",
          "Artifact ID",
          "Version",
          "Filename",
          ...(repositoryKind ? ["Repositories"] : []),
        ]}
        label="Loading artifacts"
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
    <Table aria-label="Maven content" variant="compact">
      <Thead>
        <Tr>
          <Th>Group ID</Th>
          <Th>Artifact ID</Th>
          <Th>Version</Th>
          <Th>Filename</Th>
          {repositoryKind ? <Th>Repositories</Th> : null}
        </Tr>
      </Thead>
      <Tbody>
        {content.map((artifact) => (
          <Tr key={artifact.pulp_href}>
            <Td dataLabel="Group ID">{artifact.group_id ?? "—"}</Td>
            <Td dataLabel="Artifact ID">{artifact.artifact_id ?? "—"}</Td>
            <Td dataLabel="Version">{artifact.version ?? "—"}</Td>
            <Td dataLabel="Filename">
              <code>{artifact.filename ?? "—"}</code>
            </Td>
            {repositoryKind ? (
              <Td dataLabel="Repositories">
                <RepositoryMembershipCell
                  contentHref={artifact.pulp_href}
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
