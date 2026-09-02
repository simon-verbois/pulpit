import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { usePulpPagination } from "./usePulpPagination";

describe("usePulpPagination", () => {
  it("defaults to 20 items per page when no page size is given", () => {
    const { result } = renderHook(() => usePulpPagination());

    expect(result.current.perPage).toBe(20);
  });

  it("defaults to page 1 with the given page size", () => {
    const { result } = renderHook(() => usePulpPagination(25));

    expect(result.current.page).toBe(1);
    expect(result.current.perPage).toBe(25);
    expect(result.current.limit).toBe(25);
    expect(result.current.offset).toBe(0);
  });

  it("computes offset from the current page and page size", () => {
    const { result } = renderHook(() => usePulpPagination(10));

    act(() => result.current.onSetPage(undefined, 3));

    expect(result.current.page).toBe(3);
    expect(result.current.offset).toBe(20);
  });

  it("resets to page 1 when the page size changes", () => {
    const { result } = renderHook(() => usePulpPagination(10));

    act(() => result.current.onSetPage(undefined, 4));
    act(() => result.current.onPerPageSelect(undefined, 50));

    expect(result.current.page).toBe(1);
    expect(result.current.perPage).toBe(50);
    expect(result.current.offset).toBe(0);
  });
});
