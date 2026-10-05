import { useEffect, useMemo, useRef, useState } from "react";

const MIN_AUTO_PER_PAGE = 5;
const MAX_AUTO_PER_PAGE = 50;
const NON_TABLE_HEIGHT = 410;
const COMPACT_ROW_HEIGHT = 46;
const STANDARD_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100];

/** Keep enough room for Pulpit's masthead, page/tabs/toolbars, table header,
 * and footer, then fill the remaining viewport with compact table rows. The
 * conservative shared allowance also covers nested Administration/detail
 * tabs, which have more chrome than ordinary list pages. */
export function responsivePerPage(viewportHeight: number): number {
  const availableHeight = Math.max(0, viewportHeight - NON_TABLE_HEIGHT);
  return Math.max(
    MIN_AUTO_PER_PAGE,
    Math.min(MAX_AUTO_PER_PAGE, Math.floor(availableHeight / COMPACT_ROW_HEIGHT)),
  );
}

function currentViewportHeight(): number {
  return typeof window === "undefined" ? 1080 : window.innerHeight;
}

/** Page/perPage state, translated to the limit/offset params Pulp's list
 * endpoints expect (docs/PULP_API.md "Pagination"). 1-indexed page number,
 * matching PatternFly's Pagination component. Unless a fixed initial size is
 * supplied, the default tracks the viewport height until the user explicitly
 * selects a page size. */
export function usePulpPagination(initialPerPage?: number) {
  const [page, setPage] = useState(1);
  const isAutomatic = useRef(initialPerPage === undefined);
  const [perPage, setPerPage] = useState(() =>
    initialPerPage === undefined
      ? responsivePerPage(currentViewportHeight())
      : initialPerPage,
  );
  const perPageRef = useRef(perPage);

  useEffect(() => {
    if (!isAutomatic.current) {
      return;
    }

    const updateForViewport = () => {
      if (!isAutomatic.current) {
        return;
      }
      const nextPerPage = responsivePerPage(currentViewportHeight());
      if (nextPerPage === perPageRef.current) {
        return;
      }
      perPageRef.current = nextPerPage;
      setPerPage(nextPerPage);
      setPage(1);
    };

    window.addEventListener("resize", updateForViewport);
    return () => window.removeEventListener("resize", updateForViewport);
  }, []);

  const perPageOptions = useMemo(
    () =>
      Array.from(new Set([...STANDARD_PER_PAGE_OPTIONS, perPage]))
        .sort((a, b) => a - b)
        .map((value) => ({ title: String(value), value })),
    [perPage],
  );

  return {
    page,
    perPage,
    perPageOptions,
    limit: perPage,
    offset: (page - 1) * perPage,
    onSetPage: (_event: unknown, newPage: number) => setPage(newPage),
    onPerPageSelect: (_event: unknown, newPerPage: number) => {
      isAutomatic.current = false;
      perPageRef.current = newPerPage;
      setPerPage(newPerPage);
      setPage(1);
    },
  };
}
