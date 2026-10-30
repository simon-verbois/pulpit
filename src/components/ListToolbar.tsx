import { useEffect, type ReactNode } from "react";
import {
  Pagination,
  type PaginationProps,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";

type ListPagination = Pick<
  PaginationProps,
  "page" | "perPage" | "perPageOptions" | "onPerPageSelect"
> & { onSetPage: (event: unknown, page: number) => void };

interface ListToolbarProps {
  /** Plugin-specific filters and actions, before the search field. */
  children?: ReactNode;
  search?: ReactNode;
  pagination?: ListPagination;
  itemCount?: number;
}

/** Shared control order, search width and compact pagination for lists and tabs.
 * Search/filter state and server requests remain owned by the caller. */
export function ListToolbar({
  children,
  search,
  pagination,
  itemCount = 0,
}: ListToolbarProps) {
  useEffect(() => {
    if (!pagination) return;
    const lastPage = Math.max(1, Math.ceil(itemCount / (pagination.perPage ?? 1)));
    if ((pagination.page ?? 1) > lastPage) pagination.onSetPage?.(undefined, lastPage);
  }, [pagination, itemCount]);
  return (
    <Toolbar className="pulpit-list-toolbar">
      <ToolbarContent>
        {children}
        {search ? (
          <ToolbarItem className="pulpit-list-search">{search}</ToolbarItem>
        ) : null}
        {pagination ? (
          <ToolbarItem align={{ default: "alignEnd" }}>
            <Pagination
              itemCount={itemCount}
              page={pagination.page}
              perPage={pagination.perPage}
              perPageOptions={pagination.perPageOptions}
              onSetPage={pagination.onSetPage}
              onPerPageSelect={pagination.onPerPageSelect}
              isCompact
            />
          </ToolbarItem>
        ) : null}
      </ToolbarContent>
    </Toolbar>
  );
}
