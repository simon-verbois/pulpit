import { describe, expect, it } from "vitest";

import { compatibilityStatus } from "./pulpCompatibility";

describe("compatibilityStatus", () => {
  it("matches when major.minor is identical, ignoring patch", () => {
    expect(compatibilityStatus("core", "3.116.9")).toBe("matches");
  });

  it("flags a newer minor version", () => {
    expect(compatibilityStatus("core", "3.117.0")).toBe("newer");
  });

  it("flags a newer major version", () => {
    expect(compatibilityStatus("core", "4.0.0")).toBe("newer");
  });

  it("flags an older version", () => {
    expect(compatibilityStatus("core", "3.100.0")).toBe("older");
  });

  it("is not_implemented for a component with no baseline", () => {
    // ostree is a real Pulp plugin component this app has no UI for - a
    // genuine, stable "no baseline entry" example.
    expect(compatibilityStatus("ostree", "2.6.1")).toBe("not_implemented");
  });

  it("is unverified for an unparseable version string rather than guessing", () => {
    expect(compatibilityStatus("core", "not-a-version")).toBe("unverified");
  });
});
