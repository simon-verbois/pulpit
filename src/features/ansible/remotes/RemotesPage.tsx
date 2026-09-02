import { useState } from "react";
import {
  Button,
  Flex,
  FlexItem,
  Pagination,
  PageSection,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToggleGroup,
  ToggleGroupItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import { PageHeader } from "../../../components/PageHeader";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import type {
  CollectionRemote,
  GitRemote,
  RoleRemote,
} from "../../../api/client/ansible/types";
import { useCollectionRemotesQuery } from "./useCollectionRemotesQuery";
import { useGitRemotesQuery } from "./useGitRemotesQuery";
import { useRoleRemotesQuery } from "./useRoleRemotesQuery";
import { useDeleteCollectionRemoteMutation } from "./useDeleteCollectionRemoteMutation";
import { useDeleteGitRemoteMutation } from "./useDeleteGitRemoteMutation";
import { useDeleteRoleRemoteMutation } from "./useDeleteRoleRemoteMutation";
import { CreateCollectionRemoteModal } from "./CreateCollectionRemoteModal";
import { EditCollectionRemoteModal } from "./EditCollectionRemoteModal";
import { CreateGitRemoteModal } from "./CreateGitRemoteModal";
import { EditGitRemoteModal } from "./EditGitRemoteModal";
import { CreateRoleRemoteModal } from "./CreateRoleRemoteModal";
import { EditRoleRemoteModal } from "./EditRoleRemoteModal";

type RemoteKind = "collection" | "git" | "role";

const CREATE_LABEL: Record<RemoteKind, string> = {
  collection: "Create Collection remote",
  git: "Create Git remote",
  role: "Create Role remote",
};

/** Ansible has three remote "flavors" targeting different content models
 * (Collection/Git/Role) - a bigger decision than RPM's Standard/ULN toggle,
 * but the same UI idea: switch which list/create/edit/delete set of
 * adapters the page uses, rather than merging incompatible shapes into one
 * table. */
export function RemotesPage() {
  const [kind, setKind] = useState<RemoteKind>("collection");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionRemote | null>(
    null,
  );
  const [editingGit, setEditingGit] = useState<GitRemote | null>(null);
  const [editingRole, setEditingRole] = useState<RoleRemote | null>(null);
  const [pendingDeleteCollection, setPendingDeleteCollection] =
    useState<CollectionRemote | null>(null);
  const [pendingDeleteGit, setPendingDeleteGit] = useState<GitRemote | null>(null);
  const [pendingDeleteRole, setPendingDeleteRole] = useState<RoleRemote | null>(null);
  const pagination = usePulpPagination();

  const deleteCollectionMutation = useDeleteCollectionRemoteMutation();
  const deleteGitMutation = useDeleteGitRemoteMutation();
  const deleteRoleMutation = useDeleteRoleRemoteMutation();

  const params = {
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  };
  const collectionQuery = useCollectionRemotesQuery(params);
  const gitQuery = useGitRemotesQuery(params);
  const roleQuery = useRoleRemotesQuery(params);

  const activeQuery =
    kind === "collection" ? collectionQuery : kind === "git" ? gitQuery : roleQuery;

  return (
    <>
      <PageHeader
        title="Ansible remotes"
        description="External sources Pulp can sync Ansible content from."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>{CREATE_LABEL[kind]}</Button>
        }
      />
      <PageSection hasBodyWrapper={false}>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <ToggleGroup aria-label="Remote type">
                <ToggleGroupItem
                  text="Collection"
                  isSelected={kind === "collection"}
                  onChange={() => setKind("collection")}
                />
                <ToggleGroupItem
                  text="Git"
                  isSelected={kind === "git"}
                  onChange={() => setKind("git")}
                />
                <ToggleGroupItem
                  text="Role"
                  isSelected={kind === "role"}
                  onChange={() => setKind("role")}
                />
              </ToggleGroup>
            </ToolbarItem>
            {/* Fixed width - without it, the bar grows/shrinks as the clear
                ("x") button appears/disappears with typed text (VERIFIED:
                SearchInput has no intrinsic width of its own). */}
            <ToolbarItem style={{ width: "18rem" }}>
              <SearchInput
                aria-label="Search remotes by name"
                placeholder="Search by name…"
                value={searchInput}
                onChange={(_event, value) => setSearchInput(value)}
                onSearch={() => setSearch(searchInput)}
                onClear={() => {
                  setSearchInput("");
                  setSearch("");
                }}
              />
            </ToolbarItem>
            <ToolbarItem align={{ default: "alignEnd" }}>
              <Pagination
                itemCount={activeQuery.data?.count ?? 0}
                page={pagination.page}
                perPage={pagination.perPage}
                onSetPage={pagination.onSetPage}
                onPerPageSelect={pagination.onPerPageSelect}
                isCompact
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {activeQuery.isPending ? <LoadingState label="Loading remotes" /> : null}
        {activeQuery.isError ? (
          <ErrorState error={activeQuery.error} onRetry={() => activeQuery.refetch()} />
        ) : null}
        {activeQuery.isSuccess && activeQuery.data.results.length === 0 ? (
          <EmptyState
            title={`No ${kind === "collection" ? "Collection" : kind === "git" ? "Git" : "Role"} remotes yet`}
            body="Create a remote to point at an external Ansible source you want to sync from."
            action={
              <Button onClick={() => setIsCreateOpen(true)}>{CREATE_LABEL[kind]}</Button>
            }
          />
        ) : null}

        {kind === "collection" &&
        collectionQuery.isSuccess &&
        collectionQuery.data.results.length > 0 ? (
          <Table aria-label="Collection remotes" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>URL</Th>
                <Th>Policy</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {collectionQuery.data.results.map((remote) => (
                <Tr key={remote.pulp_href}>
                  <Td dataLabel="Name">{remote.name}</Td>
                  <Td dataLabel="URL">{remote.url}</Td>
                  <Td dataLabel="Policy">{remote.policy}</Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Flex
                      flexWrap={{ default: "nowrap" }}
                      spaceItems={{ default: "spaceItemsNone" }}
                      justifyContent={{ default: "justifyContentFlexEnd" }}
                    >
                      <FlexItem>
                        <Button
                          variant="link"
                          onClick={() => setEditingCollection(remote)}
                        >
                          Edit
                        </Button>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          variant="link"
                          isDanger
                          onClick={() => setPendingDeleteCollection(remote)}
                        >
                          Delete
                        </Button>
                      </FlexItem>
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : null}

        {kind === "git" && gitQuery.isSuccess && gitQuery.data.results.length > 0 ? (
          <Table aria-label="Git remotes" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>URL</Th>
                <Th>Git ref</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {gitQuery.data.results.map((remote) => (
                <Tr key={remote.pulp_href}>
                  <Td dataLabel="Name">{remote.name}</Td>
                  <Td dataLabel="URL">{remote.url}</Td>
                  <Td dataLabel="Git ref">{remote.git_ref ?? "—"}</Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Flex
                      flexWrap={{ default: "nowrap" }}
                      spaceItems={{ default: "spaceItemsNone" }}
                      justifyContent={{ default: "justifyContentFlexEnd" }}
                    >
                      <FlexItem>
                        <Button variant="link" onClick={() => setEditingGit(remote)}>
                          Edit
                        </Button>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          variant="link"
                          isDanger
                          onClick={() => setPendingDeleteGit(remote)}
                        >
                          Delete
                        </Button>
                      </FlexItem>
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : null}

        {kind === "role" && roleQuery.isSuccess && roleQuery.data.results.length > 0 ? (
          <Table aria-label="Role remotes" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>URL</Th>
                <Th>Policy</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {roleQuery.data.results.map((remote) => (
                <Tr key={remote.pulp_href}>
                  <Td dataLabel="Name">{remote.name}</Td>
                  <Td dataLabel="URL">{remote.url}</Td>
                  <Td dataLabel="Policy">{remote.policy}</Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Flex
                      flexWrap={{ default: "nowrap" }}
                      spaceItems={{ default: "spaceItemsNone" }}
                      justifyContent={{ default: "justifyContentFlexEnd" }}
                    >
                      <FlexItem>
                        <Button variant="link" onClick={() => setEditingRole(remote)}>
                          Edit
                        </Button>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          variant="link"
                          isDanger
                          onClick={() => setPendingDeleteRole(remote)}
                        >
                          Delete
                        </Button>
                      </FlexItem>
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : null}
      </PageSection>

      {isCreateOpen && kind === "collection" ? (
        <CreateCollectionRemoteModal onClose={() => setIsCreateOpen(false)} />
      ) : null}
      {isCreateOpen && kind === "git" ? (
        <CreateGitRemoteModal onClose={() => setIsCreateOpen(false)} />
      ) : null}
      {isCreateOpen && kind === "role" ? (
        <CreateRoleRemoteModal onClose={() => setIsCreateOpen(false)} />
      ) : null}

      {editingCollection ? (
        <EditCollectionRemoteModal
          remote={editingCollection}
          onClose={() => setEditingCollection(null)}
        />
      ) : null}
      {editingGit ? (
        <EditGitRemoteModal remote={editingGit} onClose={() => setEditingGit(null)} />
      ) : null}
      {editingRole ? (
        <EditRoleRemoteModal remote={editingRole} onClose={() => setEditingRole(null)} />
      ) : null}

      {pendingDeleteCollection ? (
        <ConfirmDeleteModal
          itemTypeLabel="remote"
          itemLabel={pendingDeleteCollection.name}
          isDeleting={deleteCollectionMutation.isPending}
          onCancel={() => setPendingDeleteCollection(null)}
          onConfirm={() =>
            deleteCollectionMutation.mutate(
              {
                href: pendingDeleteCollection.pulp_href,
                name: pendingDeleteCollection.name,
              },
              { onSuccess: () => setPendingDeleteCollection(null) },
            )
          }
        />
      ) : null}
      {pendingDeleteGit ? (
        <ConfirmDeleteModal
          itemTypeLabel="remote"
          itemLabel={pendingDeleteGit.name}
          isDeleting={deleteGitMutation.isPending}
          onCancel={() => setPendingDeleteGit(null)}
          onConfirm={() =>
            deleteGitMutation.mutate(
              { href: pendingDeleteGit.pulp_href, name: pendingDeleteGit.name },
              { onSuccess: () => setPendingDeleteGit(null) },
            )
          }
        />
      ) : null}
      {pendingDeleteRole ? (
        <ConfirmDeleteModal
          itemTypeLabel="remote"
          itemLabel={pendingDeleteRole.name}
          isDeleting={deleteRoleMutation.isPending}
          onCancel={() => setPendingDeleteRole(null)}
          onConfirm={() =>
            deleteRoleMutation.mutate(
              { href: pendingDeleteRole.pulp_href, name: pendingDeleteRole.name },
              { onSuccess: () => setPendingDeleteRole(null) },
            )
          }
        />
      ) : null}
    </>
  );
}
