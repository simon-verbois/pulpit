import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import type { RpmPackage } from "../../../api/client/rpm/types";

function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

interface PackagesTableProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  packages: RpmPackage[] | undefined;
  emptyTitle: string;
  emptyBody: string;
}

export function PackagesTable({
  isPending,
  isError,
  error,
  onRetry,
  packages,
  emptyTitle,
  emptyBody,
}: PackagesTableProps) {
  if (isPending) {
    return <LoadingState label="Loading packages" />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!packages || packages.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <Table aria-label="RPM packages" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Version</Th>
          <Th>Arch</Th>
          <Th>Size</Th>
        </Tr>
      </Thead>
      <Tbody>
        {packages.map((pkg) => (
          <Tr key={pkg.pulp_href}>
            <Td dataLabel="Name">{pkg.name}</Td>
            <Td dataLabel="Version">
              {pkg.version}-{pkg.release}
            </Td>
            <Td dataLabel="Arch">{pkg.arch}</Td>
            <Td dataLabel="Size">{formatSize(pkg.size_package)}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
