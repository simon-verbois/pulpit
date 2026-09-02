import { useState } from "react";

/** Page/perPage state, translated to the limit/offset params Pulp's list
 * endpoints expect (docs/PULP_API.md "Pagination"). 1-indexed page number,
 * matching PatternFly's Pagination component. */
export function usePulpPagination(initialPerPage = 20) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(initialPerPage);

  return {
    page,
    perPage,
    limit: perPage,
    offset: (page - 1) * perPage,
    onSetPage: (_event: unknown, newPage: number) => setPage(newPage),
    onPerPageSelect: (_event: unknown, newPerPage: number) => {
      setPerPage(newPerPage);
      setPage(1);
    },
  };
}
