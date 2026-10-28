import { beforeEach, describe, expect, it } from "vitest";

import { hasNewRelease, rememberRelease } from "./seenRelease";

beforeEach(() => localStorage.clear());

describe("new release detection", () => {
  it("announces a first visit and remembers the acknowledgement per account", () => {
    expect(hasNewRelease("alice", "2026.44.5")).toBe(true);
    rememberRelease("alice", "2026.44.5");
    expect(hasNewRelease("alice", "2026.44.5")).toBe(false);
    expect(hasNewRelease("bob", "2026.44.5")).toBe(true);
  });

  it.each(["2026.44.10", "2026.45.1", "2027.1.1"])(
    "announces newer version %s using numeric version ordering",
    (version) => {
      rememberRelease("alice", "2026.44.9");
      expect(hasNewRelease("alice", version)).toBe(true);
    },
  );

  it("does not announce a rollback as a new release", () => {
    rememberRelease("alice", "2026.44.10");
    expect(hasNewRelease("alice", "2026.44.9")).toBe(false);
  });

  it("recovers from a corrupt saved preference", () => {
    rememberRelease("alice", "invalid");
    expect(hasNewRelease("alice", "2026.44.5")).toBe(true);
  });
});
