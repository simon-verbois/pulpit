import { Card, CardBody, CardTitle, Content } from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { ErrorState } from "../../../components/ErrorState";
import { LoadingState } from "../../../components/LoadingState";
import { formatRelativeTime } from "../../../lib/relativeTime";
import { TLS_CERT_SOURCE_LABEL } from "./tlsCertSource";
import { useTlsCertificateHistoryQuery } from "./useTlsCertificateHistoryQuery";

export function TlsCertificateHistorySection() {
  const historyQuery = useTlsCertificateHistoryQuery();

  return (
    <Card isCompact>
      <CardTitle>History</CardTitle>
      <CardBody>
        {historyQuery.isPending ? (
          <LoadingState
            columns={["Event", "Source", "Triggered by", "Expires", "When"]}
            label="Loading certificate history"
          />
        ) : null}
        {historyQuery.isError ? (
          <ErrorState error={historyQuery.error} onRetry={() => historyQuery.refetch()} />
        ) : null}
        {historyQuery.isSuccess && historyQuery.data.length === 0 ? (
          <Content component="small">No certificate events recorded yet.</Content>
        ) : null}
        {historyQuery.isSuccess && historyQuery.data.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <Table aria-label="TLS certificate history" variant="compact">
              <Thead>
                <Tr>
                  <Th>Event</Th>
                  <Th>Source</Th>
                  <Th>Triggered by</Th>
                  <Th>Expires</Th>
                  <Th>When</Th>
                </Tr>
              </Thead>
              <Tbody>
                {historyQuery.data.map((entry) => (
                  <Tr key={entry.id}>
                    <Td dataLabel="Event">{entry.event}</Td>
                    <Td dataLabel="Source">{TLS_CERT_SOURCE_LABEL[entry.source]}</Td>
                    <Td dataLabel="Triggered by">{entry.triggered_by}</Td>
                    <Td dataLabel="Expires">{formatRelativeTime(entry.not_after)}</Td>
                    <Td dataLabel="When">{formatRelativeTime(entry.created_at)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
