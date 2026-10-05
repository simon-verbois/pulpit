import { useQuery } from "@tanstack/react-query";
import { Pagination, Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { listContainerManifests } from "../../../api/client/container/manifests";
import type { ContainerRepository } from "../../../api/client/container/types";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { usePulpPagination } from "../../../hooks/usePulpPagination";

function formatSize(bytes: number | null): string {
  if (bytes === null) {
    return "—";
  }
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

export function RepositoryManifestsTab({
  repository,
}: {
  repository: ContainerRepository;
}) {
  const pagination = usePulpPagination();

  const manifestsQuery = useQuery({
    queryKey: [
      "pulp",
      "container",
      "manifests",
      repository.latest_version_href,
      pagination.limit,
      pagination.offset,
    ],
    queryFn: () =>
      listContainerManifests({
        limit: pagination.limit,
        offset: pagination.offset,
        repository_version: repository.latest_version_href,
      }),
  });

  return (
    <>
      {manifestsQuery.isPending ? <LoadingState label="Loading manifests" /> : null}
      {manifestsQuery.isError ? (
        <ErrorState
          error={manifestsQuery.error}
          onRetry={() => manifestsQuery.refetch()}
        />
      ) : null}
      {manifestsQuery.isSuccess && manifestsQuery.data.results.length === 0 ? (
        <EmptyState
          variant="sm"
          title="No manifests in this repository yet"
          body="Sync a remote to add manifests to this repository."
        />
      ) : null}
      {manifestsQuery.isSuccess && manifestsQuery.data.results.length > 0 ? (
        <>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem align={{ default: "alignEnd" }}>
                <Pagination
                  itemCount={manifestsQuery.data?.count ?? 0}
                  page={pagination.page}
                  perPage={pagination.perPage}
                  perPageOptions={pagination.perPageOptions}
                  onSetPage={pagination.onSetPage}
                  onPerPageSelect={pagination.onPerPageSelect}
                  isCompact
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <Table aria-label="Manifests" variant="compact">
            <Thead>
              <Tr>
                <Th>Digest</Th>
                <Th>Media type</Th>
                <Th>Architecture</Th>
                <Th>OS</Th>
                <Th>Size</Th>
              </Tr>
            </Thead>
            <Tbody>
              {manifestsQuery.data.results.map((manifest) => (
                <Tr key={manifest.pulp_href}>
                  <Td dataLabel="Digest">
                    <code>{manifest.digest}</code>
                  </Td>
                  <Td dataLabel="Media type">{manifest.media_type}</Td>
                  <Td dataLabel="Architecture">{manifest.architecture ?? "—"}</Td>
                  <Td dataLabel="OS">{manifest.os ?? "—"}</Td>
                  <Td dataLabel="Size">{formatSize(manifest.compressed_image_size)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      ) : null}
    </>
  );
}
