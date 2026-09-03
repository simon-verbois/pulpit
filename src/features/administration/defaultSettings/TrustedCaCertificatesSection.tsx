import { useState } from "react";
import {
  Button,
  Content,
  Label,
  Stack,
  StackItem,
  Tooltip,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { formatRelativeTime } from "../../../lib/relativeTime";
import type {
  TrustedCaCertificate,
  TrustedCaCertificateStatus,
} from "../../../api/client/pulpitCore/types";
import { useTrustedCaCertificatesQuery } from "./useTrustedCaCertificatesQuery";
import { useDeleteTrustedCaCertificateMutation } from "./useDeleteTrustedCaCertificateMutation";
import { AddTrustedCaCertificateModal } from "./AddTrustedCaCertificateModal";

const STATUS_COLOR: Record<TrustedCaCertificateStatus, "green" | "orange" | "red"> = {
  applied: "green",
  pending: "orange",
  failed: "red",
};

const STATUS_LABEL: Record<TrustedCaCertificateStatus, string> = {
  applied: "Applied",
  pending: "Pending",
  failed: "Failed",
};

function StatusCell({ certificate }: { certificate: TrustedCaCertificate }) {
  const label = (
    <Label isCompact color={STATUS_COLOR[certificate.status]}>
      {STATUS_LABEL[certificate.status]}
    </Label>
  );
  if (certificate.status === "failed" && certificate.last_error) {
    return <Tooltip content={certificate.last_error}>{label}</Tooltip>;
  }
  return label;
}

export function TrustedCaCertificatesSection() {
  const certificatesQuery = useTrustedCaCertificatesQuery();
  const deleteMutation = useDeleteTrustedCaCertificateMutation();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TrustedCaCertificate | null>(null);

  return (
    <Stack hasGutter>
      <StackItem>
        <Content component="h2">Trusted CA certificates</Content>
        <Content component="small">
          Copied into Pulp's own trust store (its OCI image's{" "}
          <code>/etc/pki/ca-trust/source/anchors/</code>, via <code>update-ca-trust</code>
          ) so Pulp itself trusts connections signed by these CAs - most commonly a
          corporate TLS-inspecting proxy. Requires the automation described in{" "}
          <code>docs/signing.md</code> "Automating the manual Pulp step" to be configured;
          without it, every certificate stays <strong>Pending</strong>.
        </Content>
      </StackItem>

      {certificatesQuery.isSuccess && certificatesQuery.data.length > 0 ? (
        <StackItem>
          <Button variant="secondary" onClick={() => setIsAddOpen(true)}>
            Add CA certificate
          </Button>
        </StackItem>
      ) : null}

      <StackItem>
        {certificatesQuery.isPending ? (
          <LoadingState label="Loading trusted CA certificates" />
        ) : null}
        {certificatesQuery.isError ? (
          <ErrorState
            error={certificatesQuery.error}
            onRetry={() => certificatesQuery.refetch()}
          />
        ) : null}
        {certificatesQuery.isSuccess && certificatesQuery.data.length === 0 ? (
          <EmptyState
            title="No CA certificates added yet"
            body="Add one to have Pulp trust connections signed by it - most commonly a corporate TLS-inspecting proxy."
            action={
              <Button variant="secondary" onClick={() => setIsAddOpen(true)}>
                Add CA certificate
              </Button>
            }
          />
        ) : null}
        {certificatesQuery.isSuccess && certificatesQuery.data.length > 0 ? (
          <Table aria-label="Trusted CA certificates" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Added</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {certificatesQuery.data.map((certificate) => (
                <Tr key={certificate.id}>
                  <Td dataLabel="Name">
                    <code>{certificate.name}</code>
                  </Td>
                  <Td dataLabel="Status">
                    <StatusCell certificate={certificate} />
                  </Td>
                  <Td dataLabel="Added">{formatRelativeTime(certificate.created_at)}</Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Button
                      variant="link"
                      isDanger
                      onClick={() => setPendingDelete(certificate)}
                    >
                      Delete
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : null}
      </StackItem>

      {isAddOpen ? (
        <AddTrustedCaCertificateModal onClose={() => setIsAddOpen(false)} />
      ) : null}
      {pendingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="CA certificate"
          itemLabel={pendingDelete.name}
          isDeleting={deleteMutation.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() =>
            deleteMutation.mutate(pendingDelete.id, {
              onSuccess: () => setPendingDelete(null),
            })
          }
        />
      ) : null}
    </Stack>
  );
}
