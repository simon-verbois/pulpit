import type { ReactNode } from "react";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { RepositoryMembershipCell } from "../../../components/RepositoryMembershipCell";
import type { RepositoryKind } from "../../../api/client/repositoryMembership";
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
  /** Set by a repository-detail tab caller (nested in a bigger page) -
   * unset for the equivalent top-level list page, which stays full-page. */
  emptyStateVariant?: "sm";
  /** Rendered as the empty state's own call to action - used by callers
   * whose toolbar action (e.g. "Upload package") is hidden while the list
   * is empty, so the empty state stays the sole CTA. */
  emptyAction?: ReactNode;
  repositoryKind?: RepositoryKind;
}

export function PackagesTable({
  isPending,
  isError,
  error,
  onRetry,
  packages,
  emptyTitle,
  emptyBody,
  emptyStateVariant,
  emptyAction,
  repositoryKind,
}: PackagesTableProps) {
  if (isPending) {
    return (
      <LoadingState
        columns={[
          "Name",
          "Version",
          "Arch",
          "Size",
          ...(repositoryKind ? ["Repositories"] : []),
        ]}
        label="Loading packages"
      />
    );
  }
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (!packages || packages.length === 0) {
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
    <Table aria-label="RPM packages" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Version</Th>
          <Th>Arch</Th>
          <Th>Size</Th>
          {repositoryKind ? <Th>Repositories</Th> : null}
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
