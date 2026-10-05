import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { responsivePerPage, usePulpPagination } from "./usePulpPagination";

const ORIGINAL_INNER_HEIGHT = window.innerHeight;

function setViewportHeight(height: number) {
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

describe("usePulpPagination", () => {
  beforeEach(() => setViewportHeight(1037));
  afterEach(() => setViewportHeight(ORIGINAL_INNER_HEIGHT));

  it("derives its default page size from the viewport height", () => {
    const { result } = renderHook(() => usePulpPagination());

    expect(result.current.perPage).toBe(13);
    expect(result.current.limit).toBe(13);
    expect(result.current.perPageOptions.map((option) => option.value)).toEqual([
      5, 10, 13, 20, 50, 100,
    ]);
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

  it("tracks viewport resizing and resets to page 1 while still automatic", () => {
    const { result } = renderHook(() => usePulpPagination());

    act(() => result.current.onSetPage(undefined, 3));
    setViewportHeight(1440);
    act(() => window.dispatchEvent(new Event("resize")));

    expect(result.current.page).toBe(1);
    expect(result.current.perPage).toBe(22);
  });

  it("keeps a manually selected page size across later viewport changes", () => {
    const { result } = renderHook(() => usePulpPagination());

    act(() => result.current.onPerPageSelect(undefined, 50));
    setViewportHeight(1440);
    act(() => window.dispatchEvent(new Event("resize")));

    expect(result.current.perPage).toBe(50);
  });
});

describe("responsivePerPage", () => {
  it("uses the available height while keeping practical lower and upper bounds", () => {
    expect(responsivePerPage(600)).toBe(5);
    expect(responsivePerPage(1037)).toBe(13);
    expect(responsivePerPage(1440)).toBe(22);
    expect(responsivePerPage(3000)).toBe(50);
  });
});
