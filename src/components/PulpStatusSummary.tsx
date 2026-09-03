import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  Card,
  CardBody,
  CardTitle,
  Gallery,
  Label,
  Skeleton,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import { Link } from "react-router-dom";

import type { PulpStatus } from "../api/client/status";
import type { PulpPage } from "../api/client/rpm/types";
import type { ComponentContentSize } from "../api/client/pulpitCore/types";
import { compatibilityStatus, VERIFIED_VERSIONS } from "../lib/pulpCompatibility";
import { formatBytes } from "../lib/formatBytes";

function ConnectionLabel({ connected }: { connected: boolean | undefined }) {
  if (connected === undefined) {
    return <Label>Unknown</Label>;
  }
  return connected ? (
    <Label color="green">Connected</Label>
  ) : (
    <Label color="red">Disconnected</Label>
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

const COMPATIBILITY_COLOR: Record<
  ReturnType<typeof compatibilityStatus>,
  "green" | "blue" | "orange" | "grey"
> = {
  matches: "green",
  newer: "blue",
  older: "orange",
  unverified: "grey",
  not_implemented: "grey",
};

function CompatibilityCell({
  component,
  version,
}: {
  component: string;
  version: string;
}) {
  const status = compatibilityStatus(component, version);
  const baseline = VERIFIED_VERSIONS[component];
  const text =
    status === "matches"
      ? `Matches verified ${baseline}`
      : status === "not_implemented"
        ? "Not implemented"
        : status === "unverified"
          ? "Not verified"
          : `${status === "newer" ? "Newer" : "Older"} than verified ${baseline}`;
  return (
    <Label color={COMPATIBILITY_COLOR[status]} isCompact>
      {text}
    </Label>
  );
}

export interface RepositoryCountEntry {
  /** Where this component's Repositories page lives, e.g. "/rpm/repositories". */
  path: string;
  query: UseQueryResult<PulpPage<unknown>>;
}

function RepositoryCountCell({ entry }: { entry: RepositoryCountEntry | undefined }) {
  if (!entry) {
    return <>—</>;
  }
  if (entry.query.isPending) {
    return <Skeleton width="1.5rem" screenreaderText="Loading repository count" />;
  }
  // A single failed count shouldn't take down the rest of the table.
  if (entry.query.isError) {
    return <>—</>;
  }
  return <Link to={entry.path}>{entry.query.data.count}</Link>;
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
  // A failed fetch of this one, hourly-refreshed value shouldn't take down
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
 * `repositoryCounts` and `componentSizesQuery` are optional and
 * Overview-only (docs/UX.md) - System status omits both, so neither column
 * appears there at all; they're about content inventory, not infrastructure
 * health. Unlike `repositoryCounts` (one query per plugin), size is a single
 * query for every component at once - pulpit-core precomputes it (an hourly
 * background job, see docs/UX.md "per-plugin storage-size breakdown"), so
 * there's nothing plugin-specific to gate this query on.
 */
export function PulpStatusSummary({
  status,
  repositoryCounts,
  componentSizesQuery,
}: {
  status: PulpStatus;
  repositoryCounts?: Record<string, RepositoryCountEntry>;
  componentSizesQuery?: UseQueryResult<ComponentContentSize[]>;
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
        {status.storage.used !== undefined && status.storage.total !== undefined
          ? `${formatBytes(status.storage.used)} used of ${formatBytes(status.storage.total)}`
          : status.storage.free !== undefined
            ? `${formatBytes(status.storage.free)} free`
            : "Reported, but no usable figures"}
      </StatTile>,
    );
  }

  return (
    <Stack hasGutter>
      {tiles.length > 0 ? (
        <StackItem>
          <Gallery hasGutter minWidths={{ default: "180px" }}>
            {tiles}
          </Gallery>
        </StackItem>
      ) : null}

      {status.versions && status.versions.length > 0 ? (
        <StackItem>
          <Table aria-label="Pulp components" variant="compact">
            <Thead>
              <Tr>
                <Th>Component</Th>
                <Th>Version</Th>
                <Th>Compatibility</Th>
                {repositoryCounts ? <Th>Repositories</Th> : null}
                {componentSizesQuery ? <Th>Size</Th> : null}
              </Tr>
            </Thead>
            <Tbody>
              {status.versions.map((v) => (
                <Tr key={v.component}>
                  <Td dataLabel="Component">{v.component}</Td>
                  <Td dataLabel="Version">{v.version}</Td>
                  <Td dataLabel="Compatibility">
                    <CompatibilityCell component={v.component} version={v.version} />
                  </Td>
                  {repositoryCounts ? (
                    <Td dataLabel="Repositories">
                      <RepositoryCountCell entry={repositoryCounts[v.component]} />
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
