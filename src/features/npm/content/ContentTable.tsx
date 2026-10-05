import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { RepositoryMembershipCell } from "../../../components/RepositoryMembershipCell";
import type { RepositoryKind } from "../../../api/client/repositoryMembership";
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
          "Name",
          "Version",
          "Relative path",
          ...(repositoryKind ? ["Repositories"] : []),
        ]}
        label="Loading packages"
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
    <Table aria-label="NPM content" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Version</Th>
          <Th>Relative path</Th>
          {repositoryKind ? <Th>Repositories</Th> : null}
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
            {repositoryKind ? (
              <Td dataLabel="Repositories">
                <RepositoryMembershipCell
                  contentHref={pkg.pulp_href}
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
