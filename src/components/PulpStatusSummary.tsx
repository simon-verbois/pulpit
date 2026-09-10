import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  Card,
  CardBody,
  CardTitle,
  Gallery,
  Skeleton,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { Link } from "react-router-dom";

import type { PulpStatus } from "../api/client/status";
import type {
  ComponentContentSize,
  ComponentRepositoryCount,
} from "../api/client/pulpitCore/types";
import { formatBytes } from "../lib/formatBytes";
import { VERIFIED_VERSIONS } from "../lib/pulpCompatibility";
import { NAV_TREE } from "../app/layout/navTree";
import { StatusIndicator } from "./StatusIndicator";

// A status component's name doubles as its nav module id (rpm, deb, container,
// ansible, file, hugging_face, gem, maven, npm, python) - see NAV_TREE's own
// "module id" doc comment. "core" has no group (always shown, same as
// Overview/Tasks/Administration), so it's never in this set and never
// nav-visibility-gated below.
const NAV_MODULE_IDS = new Set(
  NAV_TREE.filter((node) => node.type === "group").map((node) => node.id),
);

function ConnectionLabel({ connected }: { connected: boolean | undefined }) {
  if (connected === undefined) {
    return <StatusIndicator color="grey">Unknown</StatusIndicator>;
  }
  return connected ? (
    <StatusIndicator color="green">Connected</StatusIndicator>
  ) : (
    <StatusIndicator color="red">Disconnected</StatusIndicator>
  );
}

function StatTile({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card isCompact>
      <CardTitle>{title}</CardTitle>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function StorageUsage({ storage }: { storage: NonNullable<PulpStatus["storage"]> }) {
  if (storage.used === undefined || storage.total === undefined || storage.total === 0) {
    return storage.free !== undefined
      ? `${formatBytes(storage.free)} free`
      : "Reported, but no usable figures";
  }
  return `${formatBytes(storage.used)} / ${formatBytes(storage.total)}`;
}

function RepositoryCountCell({
  query,
  component,
  path,
}: {
  query: UseQueryResult<ComponentRepositoryCount[]>;
  component: string;
  path: string | undefined;
}) {
  if (query.isPending) {
    return <Skeleton width="1.5rem" screenreaderText="Loading repository count" />;
  }
  // A failed fetch of this derived value shouldn't take down the rest of
  // the table - same treatment as a failed size fetch.
  if (query.isError || !path) {
    return <>—</>;
  }
  const entry = query.data.find((row) => row.component === component);
  return entry ? <Link to={path}>{entry.count}</Link> : <>—</>;
}

function SizeCell({
  query,
  component,
}: {
  query: UseQueryResult<ComponentContentSize[]>;
  component: string;
}) {
  if (query.isPending) {
    return <Skeleton width="3rem" screenreaderText="Loading size" />;
  }
  // A failed fetch of this derived value shouldn't take down
  // the rest of the table - same treatment as a failed repository count.
  if (query.isError) {
    return <>—</>;
  }
  const entry = query.data.find((size) => size.component === component);
  return <>{entry ? formatBytes(entry.size_bytes) : "—"}</>;
}

/**
 * Renders only the fields Pulp's /status/ response actually included -
 * never a fabricated value (docs/ARCHITECTURE.md, docs/PULP_API.md).
 *
 * `repositoryCountsQuery`/`repositoryPaths` and `componentSizesQuery` are
 * optional - OverviewPage (this component's only caller) always supplies
 * both, but neither is about infrastructure health (what `status` itself
 * covers), so both stay optional rather than required. Both are single,
 * backend-cached queries (pulpit-core's content_size module - see
 * docs/ARCHITECTURE.md "Derived content sizes and repository counts"),
 * cached further by the browser's TanStack Query on top of that.
 */
export function PulpStatusSummary({
  status,
  repositoryCountsQuery,
  repositoryPaths,
  componentSizesQuery,
  visibleModuleIds,
}: {
  status: PulpStatus;
  repositoryCountsQuery?: UseQueryResult<ComponentRepositoryCount[]>;
  /** Where each component's Repositories page lives, e.g. { rpm: "/rpm/repositories" }. */
  repositoryPaths?: Record<string, string>;
  componentSizesQuery?: UseQueryResult<ComponentContentSize[]>;
  /** Same allow-list AppNav gates the sidebar with (undefined/null both mean
   * unrestricted - fails open the same way, e.g. while still loading) - so
   * this table never lists a plugin the user can't actually navigate to. */
  visibleModuleIds?: string[] | null;
}) {
  const tiles: ReactNode[] = [];

  if (status.database_connection) {
    tiles.push(
      <StatTile key="database" title="Database">
        <ConnectionLabel connected={status.database_connection.connected} />
      </StatTile>,
    );
  }
  if (status.redis_connection !== undefined && status.redis_connection !== null) {
    tiles.push(
      <StatTile key="redis" title="Redis">
        <ConnectionLabel connected={status.redis_connection.connected} />
      </StatTile>,
    );
  }
  if (status.online_workers) {
    tiles.push(
      <StatTile key="workers" title="Online workers">
        {status.online_workers.length}
      </StatTile>,
    );
  }
  if (status.online_api_apps) {
    tiles.push(
      <StatTile key="api-apps" title="Online API apps">
        {status.online_api_apps.length}
      </StatTile>,
    );
  }
  if (status.online_content_apps) {
    tiles.push(
      <StatTile key="content-apps" title="Online content apps">
        {status.online_content_apps.length}
      </StatTile>,
    );
  }
  if (status.storage) {
    tiles.push(
      <StatTile key="storage" title="Storage">
        <StorageUsage storage={status.storage} />
      </StatTile>,
    );
  }
  // Pulpit has no GUI for most components a Pulp instance reports (e.g.
  // ostree/certguard) - listing them here is pure noise (always a dash for
  // Repositories/Size, nothing to click through to). Only components
  // Pulpit has a verified baseline for (src/lib/pulpCompatibility.ts) - the
  // ones it actually has a UI for - are shown; a real compatibility issue
  // among THESE still surfaces via the Overview page's warnings card,
  // unaffected by this filter. "core" is the same kind of noise (always a
  // dash for Repositories/Size too - it isn't a content plugin) even though
  // it does have a verified baseline - excluded from the table by request,
  // but its entry in VERIFIED_VERSIONS stays so that warnings card still
  // catches a real pulpcore version mismatch.
  //
  // A plugin's own nav module can still be hidden on top of that (an
  // explicit nav-visibility restriction, or the sidebar's capability gate
  // never applying here since these are already the components Pulp
  // itself reported) - this table should never list a plugin the user
  // can't actually navigate to from the sidebar.
  const implementedVersions = (status.versions ?? []).filter(
    (v) =>
      v.component !== "core" &&
      v.component in VERIFIED_VERSIONS &&
      (!NAV_MODULE_IDS.has(v.component) ||
        visibleModuleIds == null ||
        visibleModuleIds.includes(v.component)),
  );

  return (
    <Stack hasGutter>
      {tiles.length > 0 ? (
        <StackItem>
          <Gallery
            hasGutter
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
          >
            {tiles}
          </Gallery>
        </StackItem>
      ) : null}

      {implementedVersions.length > 0 ? (
        <StackItem>
          <Table aria-label="Pulp components" variant="compact">
            <Thead>
              <Tr>
                <Th>Component</Th>
                <Th>Version</Th>
                {repositoryCountsQuery ? <Th>Repositories</Th> : null}
                {componentSizesQuery ? <Th>Size</Th> : null}
              </Tr>
            </Thead>
            <Tbody>
              {implementedVersions.map((v) => (
                <Tr key={v.component}>
                  <Td dataLabel="Component">{v.component}</Td>
                  <Td dataLabel="Version">{v.version}</Td>
                  {repositoryCountsQuery ? (
                    <Td dataLabel="Repositories">
                      <RepositoryCountCell
                        query={repositoryCountsQuery}
                        component={v.component}
                        path={repositoryPaths?.[v.component]}
                      />
                    </Td>
                  ) : null}
                  {componentSizesQuery ? (
                    <Td dataLabel="Size">
                      <SizeCell query={componentSizesQuery} component={v.component} />
                    </Td>
                  ) : null}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </StackItem>
      ) : null}
    </Stack>
  );
}
