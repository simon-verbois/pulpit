import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Checkbox,
  Content,
  FormGroup,
  FormSelect,
  FormSelectOption,
  SearchInput,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import {
  COPY_CONTENT_TYPES,
  listCopyContent,
  type CopyKind,
} from "../api/client/contentSelection";
import { usePulpPagination } from "../hooks/usePulpPagination";
import { useClientSideSearch } from "../hooks/useClientSideSearch";
import { ListToolbar } from "./ListToolbar";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";

export function ContentSelectionTable({
  kind,
  versionHref,
  selection,
  onChange,
  fixedType,
}: {
  kind: CopyKind;
  versionHref: string;
  selection: string[];
  onChange: (selection: string[]) => void;
  fixedType?: string;
}) {
  const [typeId, setTypeId] = useState(COPY_CONTENT_TYPES[kind][0].id);
  const type = fixedType ?? typeId;
  const [search, setSearch] = useState("");
  const pagination = usePulpPagination(5, `${type}\n${search}`);
  const query = useQuery({
    queryKey: ["pulp", "copy-content-options", kind, type, versionHref],
    queryFn: () => listCopyContent(kind, type, versionHref),
  });
  const { paged, totalCount } = useClientSideSearch(
    query.data,
    search,
    (item) => item.label,
    pagination,
  );
  return (
    <>
      {!fixedType ? (
        <FormGroup label="Content type" fieldId="copy-content-type">
          <FormSelect
            id="copy-content-type"
            value={type}
            onChange={(_, value) => setTypeId(value)}
          >
            {COPY_CONTENT_TYPES[kind].map((item) => (
              <FormSelectOption key={item.id} value={item.id} label={item.label} />
            ))}
          </FormSelect>
        </FormGroup>
      ) : null}
      <Content component="p">
        {selection.length} selected. Selections are kept when you change pages or content
        types.
      </Content>
      <ListToolbar
        search={
          <SearchInput
            aria-label="Search content to copy"
            value={search}
            onChange={(_, value) => setSearch(value)}
            onClear={() => setSearch("")}
          />
        }
        pagination={pagination}
        itemCount={totalCount}
      />
      {query.isPending ? <LoadingState label="Loading content choices" /> : null}
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : null}
      {query.isSuccess && !paged.length ? (
        <EmptyState variant="xs" title="No matching content in this version" />
      ) : null}
      {paged.length ? (
        <Table aria-label="Content to copy" variant="compact">
          <Thead>
            <Tr>
              <Th screenReaderText="Select content" />
              <Th>Content</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paged.map((item) => (
              <Tr key={item.href}>
                <Td>
                  <Checkbox
                    id={`copy-content-${item.href.split("/").filter(Boolean).at(-1)}`}
                    aria-label={`Select ${item.label}`}
                    isChecked={selection.includes(item.value)}
                    onChange={(_, checked) =>
                      onChange(
                        checked
                          ? [...new Set([...selection, item.value])]
                          : selection.filter((value) => value !== item.value),
                      )
                    }
                  />
                </Td>
                <Td>{item.label}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : null}
    </>
  );
}
