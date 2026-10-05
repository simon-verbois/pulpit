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
import { MetricCard } from "../features/overview/MetricCard";
import { SERVICE_METADATA } from "../features/overview/serviceMetadata";
import { BrandIcon } from "./icons/BrandIcon";
import { UiIcon } from "./icons/UiIcon";

// A status component's name doubles as its nav module id (rpm, deb, container,
// ansible, file, hugging_face, gem, maven, npm, python) - see NAV_TREE's own
// "module id" doc comment. "core" has no group (always shown, same as
// Overview/Tasks/Administration), so it's never in this set and never
// nav-visibility-gated below.
const NAV_MODULE_IDS = new Set(
  NAV_TREE.filter((node) => node.type === "group").map((node) => node.id),
);
const NAV_MODULE_ORDER = new Map(
  NAV_TREE.filter((node) => node.type === "group").map((node, index) => [node.id, index]),
);

function connectionText(connected: boolean | undefined) {
  if (connected === undefined) return "Unknown";
  return connected ? "Connected" : "Disconnected";
}

function storageUsage(storage: NonNullable<PulpStatus["storage"]>) {
  if (storage.used === undefined || storage.total === undefined || storage.total === 0) {
    return {
      text:
        storage.free !== undefined
          ? `${formatBytes(storage.free)} free`
          : "No usable figures",
      percent: undefined,
    };
  }
  const percentUsed = Math.round((storage.used / storage.total) * 100);
  return {
    text: `${formatBytes(storage.used)} / ${formatBytes(storage.total)} (${percentUsed}%)`,
    percent: percentUsed,
  };
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
  const databaseConnected = status.database_connection?.connected;
  const redisConnected = status.redis_connection?.connected;

  if (status.database_connection) {
    tiles.push(
      <MetricCard
        key="database"
        label="Database"
        value={connectionText(databaseConnected)}
        icon={<BrandIcon name="database" branded />}
      />,
    );
  }
  if (status.redis_connection !== undefined && status.redis_connection !== null) {
    tiles.push(
      <MetricCard
        key="redis"
        label="Redis"
        value={connectionText(redisConnected)}
        icon={<BrandIcon name="redis" branded />}
      />,
    );
  }
  if (status.online_workers) {
    tiles.push(
      <MetricCard
        key="workers"
        label="Online workers"
        value={`${status.online_workers.length} Ready`}
        icon={<UiIcon name="workers" />}
      />,
    );
  }
  if (status.online_api_apps) {
    tiles.push(
      <MetricCard
        key="api-apps"
        label="Online API apps"
        value={`${status.online_api_apps.length} Running`}
        icon={<UiIcon name="api" />}
      />,
    );
  }
  if (status.online_content_apps) {
    tiles.push(
      <MetricCard
        key="content-apps"
        label="Online content apps"
        value={`${status.online_content_apps.length} Running`}
        icon={<BrandIcon name="storage" />}
      />,
    );
  }
  if (status.storage) {
    const usage = storageUsage(status.storage);
    tiles.push(
      <MetricCard
        key="storage"
        label="Storage"
        value={usage.text}
        icon={<UiIcon name="storage" />}
        isStorage
      />,
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
  const implementedVersions = (status.versions ?? [])
    .filter(
      (v) =>
        v.component !== "core" &&
        v.component in VERIFIED_VERSIONS &&
        (!NAV_MODULE_IDS.has(v.component) ||
          visibleModuleIds == null ||
          visibleModuleIds.includes(v.component)),
    )
    .sort(
      (a, b) =>
        (NAV_MODULE_ORDER.get(a.component) ?? Number.MAX_SAFE_INTEGER) -
        (NAV_MODULE_ORDER.get(b.component) ?? Number.MAX_SAFE_INTEGER),
    );

  return (
    <Stack hasGutter className="pulpit-status-stack">
      {tiles.length > 0 ? (
        <StackItem>
          <Gallery
            hasGutter
            className="pulpit-metric-gallery"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
          >
            {tiles}
          </Gallery>
        </StackItem>
      ) : null}

      {implementedVersions.length > 0 ? (
        <StackItem>
          <Card isCompact className="pulpit-dashboard-panel">
            <CardTitle>Modules</CardTitle>
            <CardBody>
              <Table aria-label="Pulp components" variant="compact" borders={false}>
                <Thead>
                  <Tr>
                    <Th>Service type</Th>
                    <Th>Component</Th>
                    <Th>Version</Th>
                    <Th>Version status</Th>
                    {repositoryCountsQuery ? <Th>Repositories</Th> : null}
                    {componentSizesQuery ? <Th>Size</Th> : null}
                  </Tr>
                </Thead>
                <Tbody>
                  {implementedVersions.map((v) => (
                    <Tr key={v.component}>
                      <Td dataLabel="Service type">
                        <span className="pulpit-service-type">
                          <BrandIcon
                            name={SERVICE_METADATA[v.component].icon}
                            branded
                            size="1.5rem"
                          />
                          {SERVICE_METADATA[v.component].label}
                        </span>
                      </Td>
                      <Td dataLabel="Component">{v.component}</Td>
                      <Td dataLabel="Version">{v.version}</Td>
                      <Td dataLabel="Version status">
                        <StatusIndicator
                          color={
                            v.version === VERIFIED_VERSIONS[v.component]
                              ? "green"
                              : "yellow"
                          }
                          isCompact
                        >
                          {v.version === VERIFIED_VERSIONS[v.component]
                            ? "Verified"
                            : "Review compatibility"}
                        </StatusIndicator>
                      </Td>
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
            </CardBody>
          </Card>
        </StackItem>
      ) : null}
    </Stack>
  );
}
