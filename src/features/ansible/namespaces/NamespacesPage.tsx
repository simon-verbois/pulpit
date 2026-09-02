import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Button,
  FormSelect,
  FormSelectOption,
  Pagination,
  PageSection,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { PageHeader } from "../../../components/PageHeader";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { listAllAnsibleDistributions } from "../../../api/client/ansible/distributions";
import type { GalaxyNamespace } from "../../../api/client/ansible/types";
import { useGalaxyNamespacesQuery } from "./useGalaxyNamespacesQuery";
import { useDeleteGalaxyNamespaceMutation } from "./useDeleteGalaxyNamespaceMutation";
import { CreateNamespaceModal } from "./CreateNamespaceModal";
import { EditNamespaceModal } from "./EditNamespaceModal";

/** Galaxy namespace management is scoped to one distribution's own
 * Galaxy-compatible API mount (see src/api/client/ansible/galaxyNamespaces.ts)
 * - not a global list, so this page starts with a distribution picker. */
export function NamespacesPage() {
  const [distributionBasePath, setDistributionBasePath] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNamespace, setEditingNamespace] = useState<GalaxyNamespace | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GalaxyNamespace | null>(null);
  const pagination = usePulpPagination();
  const deleteMutation = useDeleteGalaxyNamespaceMutation(distributionBasePath);

  const distributionsQuery = useQuery({
    queryKey: ["pulp", "ansible", "distributions", "all"],
    queryFn: listAllAnsibleDistributions,
    // A distribution with no repository attached (VERIFIED live: this
    // happens for real - e.g. its repository was deleted after the
    // distribution was created) can't serve Galaxy-v3 content at all: the
    // namespaces endpoint returns a genuine 403 permission_denied for it,
    // even to a superuser, rather than an empty list. Excluding it here is
    // simpler and less confusing than surfacing that error after the fact.
    select: (distributions) =>
      distributions.filter((distribution) => distribution.repository),
  });
  const namespacesQuery = useGalaxyNamespacesQuery(distributionBasePath, {
    limit: pagination.limit,
    offset: pagination.offset,
  });

  return (
    <>
      <PageHeader
        title="Namespaces"
        description="Galaxy namespace profiles (company, contact, avatar) for a distribution's collections."
        actions={
          <Button
            isDisabled={!distributionBasePath}
            onClick={() => setIsCreateOpen(true)}
          >
            Create namespace
          </Button>
        }
      />
      <PageSection hasBodyWrapper={false}>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem style={{ width: "18rem" }}>
              <FormSelect
                aria-label="Distribution"
                value={distributionBasePath}
                onChange={(_event, value) => setDistributionBasePath(value)}
              >
                <FormSelectOption key="" value="" label="Select a distribution…" />
                {(distributionsQuery.data ?? []).map((distribution) => (
                  <FormSelectOption
                    key={distribution.pulp_href}
                    value={distribution.base_path}
                    label={distribution.name}
                  />
                ))}
              </FormSelect>
            </ToolbarItem>
            {distributionBasePath ? (
              <ToolbarItem align={{ default: "alignEnd" }}>
                <Pagination
                  itemCount={namespacesQuery.data?.count ?? 0}
                  page={pagination.page}
                  perPage={pagination.perPage}
                  onSetPage={pagination.onSetPage}
                  onPerPageSelect={pagination.onPerPageSelect}
                  isCompact
                />
              </ToolbarItem>
            ) : null}
          </ToolbarContent>
        </Toolbar>

        {!distributionBasePath ? (
          <EmptyState
            title="Select a distribution"
            body="Namespace profiles belong to one distribution's own Galaxy-compatible API - pick one above to manage its namespaces."
          />
        ) : null}
        {distributionBasePath && namespacesQuery.isPending ? (
          <LoadingState label="Loading namespaces" />
        ) : null}
        {distributionBasePath && namespacesQuery.isError ? (
          <ErrorState
            error={namespacesQuery.error}
            onRetry={() => namespacesQuery.refetch()}
          />
        ) : null}
        {distributionBasePath &&
        namespacesQuery.isSuccess &&
        namespacesQuery.data.results.length === 0 ? (
          <EmptyState
            title="No namespaces yet"
            body="Create a namespace profile for this distribution."
            action={
              <Button onClick={() => setIsCreateOpen(true)}>Create namespace</Button>
            }
          />
        ) : null}
        {distributionBasePath &&
        namespacesQuery.isSuccess &&
        namespacesQuery.data.results.length > 0 ? (
          <Table aria-label="Namespaces" variant="compact">
            <Thead>
              <Tr>
                <Th screenReaderText="Avatar" />
                <Th>Name</Th>
                <Th>Company</Th>
                <Th>Email</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {namespacesQuery.data.results.map((namespace) => (
                <Tr key={namespace.pulp_href}>
                  <Td dataLabel="Avatar">
                    {namespace.avatar_url ? (
                      <Avatar src={namespace.avatar_url} alt="" />
                    ) : null}
                  </Td>
                  <Td dataLabel="Name">{namespace.name}</Td>
                  <Td dataLabel="Company">{namespace.company || "—"}</Td>
                  <Td dataLabel="Email">{namespace.email || "—"}</Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Button variant="link" onClick={() => setEditingNamespace(namespace)}>
                      Edit
                    </Button>
                    <Button
                      variant="link"
                      isDanger
                      onClick={() => setPendingDelete(namespace)}
                    >
                      Delete
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : null}
      </PageSection>

      {isCreateOpen ? (
        <CreateNamespaceModal
          distributionBasePath={distributionBasePath}
          onClose={() => setIsCreateOpen(false)}
        />
      ) : null}
      {editingNamespace ? (
        <EditNamespaceModal
          namespace={editingNamespace}
          distributionBasePath={distributionBasePath}
          onClose={() => setEditingNamespace(null)}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmDeleteModal
          itemTypeLabel="namespace"
          itemLabel={pendingDelete.name}
          isDeleting={deleteMutation.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() =>
            deleteMutation.mutate(
              { name: pendingDelete.name },
              { onSuccess: () => setPendingDelete(null) },
            )
          }
        />
      ) : null}
    </>
  );
}
