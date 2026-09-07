import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { useUrlTab } from "./useUrlTab";

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(MemoryRouter, { initialEntries: ["/"] }, children);
}

describe("useUrlTab", () => {
  it("defaults to the given tab when the URL has no ?tab=", () => {
    const { result } = renderHook(() => useUrlTab("overview"), { wrapper });

    expect(result.current[0]).toBe("overview");
  });

  it("reads the active tab from an existing ?tab= query param", () => {
    const { result } = renderHook(() => useUrlTab("overview"), {
      wrapper: ({ children }) =>
        createElement(
          MemoryRouter,
          { initialEntries: ["/?tab=distributions"] },
          children,
        ),
    });

    expect(result.current[0]).toBe("distributions");
  });

  it("updates the read-back active tab when switching tabs", () => {
    const { result } = renderHook(() => useUrlTab("overview"), { wrapper });

    act(() => result.current[1]("distributions"));

    expect(result.current[0]).toBe("distributions");
  });

  it("supports a custom query param name so multiple tab groups can coexist on one page", () => {
    const { result } = renderHook(() => useUrlTab("users", "subtab"), {
      wrapper: ({ children }) =>
        createElement(MemoryRouter, { initialEntries: ["/?subtab=roles"] }, children),
    });

    expect(result.current[0]).toBe("roles");
  });
});
