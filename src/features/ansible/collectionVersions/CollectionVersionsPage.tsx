import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Content, Flex, FlexItem, SearchInput } from "@patternfly/react-core";

import { ListToolbar } from "../../../components/ListToolbar";
import { PageLayout } from "../../../components/PageLayout";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useClientSideSearch } from "../../../hooks/useClientSideSearch";
import { listAllCollectionVersions } from "../../../api/client/ansible/collectionVersions";
import { useCollectionDeprecationsQuery } from "./useCollectionDeprecationsQuery";
import { CollectionVersionsTable } from "./CollectionVersionsTable";
import { DeprecateCollectionModal } from "./DeprecateCollectionModal";

export function CollectionVersionsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isDeprecateOpen, setIsDeprecateOpen] = useState(false);
  const pagination = usePulpPagination(undefined, search);

  // No server-side `name__contains` exists for this endpoint (VERIFIED
  // live) - listAllCollectionVersions's own comment explains why this
  // fetches everything and filters/paginates client-side instead.
  const collectionVersionsQuery = useQuery({
    queryKey: ["pulp", "ansible", "collectionVersions", "all"],
    queryFn: listAllCollectionVersions,
  });
  const { paged, totalCount } = useClientSideSearch(
    collectionVersionsQuery.data,
    search,
    (cv) => cv.name,
    pagination,
  );
  const isFiltered = search.trim() !== "";
  const deprecationsQuery = useCollectionDeprecationsQuery();

  return (
    <>
      <PageLayout
        title="Collections"
        description="Collection versions across every Ansible repository Pulp knows about."
        actions={
          <Button variant="secondary" onClick={() => setIsDeprecateOpen(true)}>
            Deprecate collection…
          </Button>
        }
      >
        {deprecationsQuery.data &&
        (deprecationsQuery.data.results.length > 0 || pagination.page > 1) ? (
          <Content component="p">
            <strong>Deprecated:</strong>{" "}
            <Flex
              spaceItems={{ default: "spaceItemsSm" }}
              display={{ default: "inlineFlex" }}
              alignItems={{ default: "alignItemsCenter" }}
            >
              <FlexItem className="pulpit-inline-values">
                {deprecationsQuery.data.results
                  .map((dep) => `${dep.namespace}.${dep.name}`)
                  .join(", ")}
              </FlexItem>
            </Flex>
          </Content>
        ) : null}
        {collectionVersionsQuery.isSuccess && (totalCount > 0 || isFiltered) ? (
          <ListToolbar
            search={
              <SearchInput
                aria-label="Search collections by name"
                placeholder="Search by name…"
                value={searchInput}
                onChange={(_event, value) => setSearchInput(value)}
                onSearch={() => setSearch(searchInput)}
                onClear={() => {
                  setSearchInput("");
                  setSearch("");
                }}
              />
            }
            pagination={pagination}
            itemCount={totalCount}
          />
        ) : null}

        <CollectionVersionsTable
          isPending={collectionVersionsQuery.isPending}
          isError={collectionVersionsQuery.isError}
          error={collectionVersionsQuery.error}
          onRetry={() => collectionVersionsQuery.refetch()}
          collectionVersions={paged}
          repositoryKind="ansible"
          emptyTitle={isFiltered ? "No matching collections" : "No collections yet"}
          emptyBody={
            isFiltered
              ? "Try a different search, or clear it to see every collection."
              : "Collections appear here once a repository has synced content or a collection has been uploaded."
          }
        />
      </PageLayout>

      {isDeprecateOpen ? (
        <DeprecateCollectionModal onClose={() => setIsDeprecateOpen(false)} />
      ) : null}
    </>
  );
}
