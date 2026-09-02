import { Label } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
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
    <Label color={SEVERITY_COLOR[severity.toLowerCase()] ?? "grey"}>{severity}</Label>
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
}

export function AdvisoriesTable({
  isPending,
  isError,
  error,
  onRetry,
  advisories,
  emptyTitle,
  emptyBody,
}: AdvisoriesTableProps) {
  if (isPending) {
    return <LoadingState label="Loading advisories" />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!advisories || advisories.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
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
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
