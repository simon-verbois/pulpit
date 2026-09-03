import { useState } from "react";
import {
  Button,
  Content,
  Flex,
  FlexItem,
  Label,
  Pagination,
  PageSection,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";

import { PageHeader } from "../../../components/PageHeader";
import { usePulpPagination } from "../../../hooks/usePulpPagination";
import { useCollectionVersionsQuery } from "./useCollectionVersionsQuery";
import { useCollectionDeprecationsQuery } from "./useCollectionDeprecationsQuery";
import { CollectionVersionsTable } from "./CollectionVersionsTable";
import { DeprecateCollectionModal } from "./DeprecateCollectionModal";

export function CollectionVersionsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isDeprecateOpen, setIsDeprecateOpen] = useState(false);
  const pagination = usePulpPagination();

  const collectionVersionsQuery = useCollectionVersionsQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    name__icontains: search || undefined,
  });
  const deprecationsQuery = useCollectionDeprecationsQuery();

  return (
    <>
      <PageHeader
        title="Collections"
        description="Collection versions across every Ansible repository Pulp knows about."
        actions={
          <Button variant="secondary" onClick={() => setIsDeprecateOpen(true)}>
            Deprecate collection…
          </Button>
        }
      />
      <PageSection hasBodyWrapper={false}>
        {deprecationsQuery.data && deprecationsQuery.data.results.length > 0 ? (
          <Content component="p">
            <strong>Deprecated:</strong>{" "}
            <Flex
              spaceItems={{ default: "spaceItemsSm" }}
              display={{ default: "inlineFlex" }}
              alignItems={{ default: "alignItemsCenter" }}
            >
              {deprecationsQuery.data.results.map((dep) => (
                <FlexItem key={dep.pulp_href}>
                  <Label isCompact color="orange">
                    {dep.namespace}.{dep.name}
                  </Label>
                </FlexItem>
              ))}
            </Flex>
          </Content>
        ) : null}
        <Toolbar>
          <ToolbarContent>
            {/* Fixed width - without it, the bar grows/shrinks as the clear
                ("x") button appears/disappears with typed text (VERIFIED:
                SearchInput has no intrinsic width of its own). */}
            <ToolbarItem style={{ width: "18rem" }}>
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
            </ToolbarItem>
            <ToolbarItem align={{ default: "alignEnd" }}>
              <Pagination
                itemCount={collectionVersionsQuery.data?.count ?? 0}
                page={pagination.page}
                perPage={pagination.perPage}
                onSetPage={pagination.onSetPage}
                onPerPageSelect={pagination.onPerPageSelect}
                isCompact
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        <CollectionVersionsTable
          isPending={collectionVersionsQuery.isPending}
          isError={collectionVersionsQuery.isError}
          error={collectionVersionsQuery.error}
          onRetry={() => collectionVersionsQuery.refetch()}
          collectionVersions={collectionVersionsQuery.data?.results}
          emptyTitle="No collections yet"
          emptyBody="Collections appear here once a repository has synced content or a collection has been uploaded."
        />
      </PageSection>

      {isDeprecateOpen ? (
        <DeprecateCollectionModal onClose={() => setIsDeprecateOpen(false)} />
      ) : null}
    </>
  );
}
