import type { ReactNode } from "react";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { StatusIndicator } from "../../../components/StatusIndicator";
import { RepositoryMembershipCell } from "../../../components/RepositoryMembershipCell";
import type { RepositoryKind } from "../../../api/client/repositoryMembership";
import type { RpmAdvisory } from "../../../api/client/rpm/types";

const SEVERITY_COLOR: Record<string, "red" | "orange" | "yellow" | "green" | "grey"> = {
  critical: "red",
  important: "orange",
  moderate: "yellow",
  low: "green",
};

function SeverityLabel({ severity }: { severity: string }) {
  if (!severity) {
    return <>—</>;
  }
  return (
    <StatusIndicator color={SEVERITY_COLOR[severity.toLowerCase()] ?? "grey"}>
      {severity}
    </StatusIndicator>
  );
}

interface AdvisoriesTableProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  advisories: RpmAdvisory[] | undefined;
  emptyTitle: string;
  emptyBody: string;
  /** Set by a repository-detail tab caller (nested in a bigger page) -
   * unset for the equivalent top-level list page, which stays full-page. */
  emptyStateVariant?: "sm";
  /** Rendered as the empty state's own call to action - used by callers
   * whose toolbar action (e.g. "Upload advisory") is hidden while the list
   * is empty, so the empty state stays the sole CTA. */
  emptyAction?: ReactNode;
  repositoryKind?: RepositoryKind;
}

export function AdvisoriesTable({
  isPending,
  isError,
  error,
  onRetry,
  advisories,
  emptyTitle,
  emptyBody,
  emptyStateVariant,
  emptyAction,
  repositoryKind,
}: AdvisoriesTableProps) {
  if (isPending) {
    return <LoadingState label="Loading advisories" />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!advisories || advisories.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        body={emptyBody}
        variant={emptyStateVariant}
        action={emptyAction}
      />
    );
  }

  return (
    <Table aria-label="RPM advisories" variant="compact">
      <Thead>
        <Tr>
          <Th>ID</Th>
          <Th>Title</Th>
          <Th>Type</Th>
          <Th>Severity</Th>
          <Th>Issued</Th>
          {repositoryKind ? <Th>Repositories</Th> : null}
        </Tr>
      </Thead>
      <Tbody>
        {advisories.map((advisory) => (
          <Tr key={advisory.pulp_href}>
            <Td dataLabel="ID">{advisory.id}</Td>
            <Td dataLabel="Title">{advisory.title}</Td>
            <Td dataLabel="Type">{advisory.type}</Td>
            <Td dataLabel="Severity">
              <SeverityLabel severity={advisory.severity} />
            </Td>
            <Td dataLabel="Issued">{advisory.issued_date}</Td>
            {repositoryKind ? (
              <Td dataLabel="Repositories">
                <RepositoryMembershipCell
                  contentHref={advisory.pulp_href}
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
