import { beforeEach, describe, expect, it } from "vitest";

import { hasNewRelease, rememberRelease } from "./seenRelease";

let readerId: string;
beforeEach(() => {
  readerId = crypto.randomUUID();
  localStorage.clear();
  for (const cookie of document.cookie.split(";")) {
    document.cookie = `${cookie.split("=")[0].trim()}=; Max-Age=0; Path=/`;
  }
});

describe("new release detection", () => {
  it("announces a first visit and remembers the acknowledgement per account", () => {
    expect(hasNewRelease(readerId, "2026.44.5")).toBe(true);
    rememberRelease(readerId, "2026.44.5");
    expect(hasNewRelease(readerId, "2026.44.5")).toBe(false);
    expect(hasNewRelease("bob", "2026.44.5")).toBe(true);
  });

  it.each(["2026.44.10", "2026.45.1", "2027.1.1"])(
    "announces newer version %s using numeric version ordering",
    (version) => {
      rememberRelease(readerId, "2026.44.9");
      expect(hasNewRelease(readerId, version)).toBe(true);
    },
  );

  it("does not announce a rollback as a new release", () => {
    rememberRelease(readerId, "2026.44.10");
    expect(hasNewRelease(readerId, "2026.44.9")).toBe(false);
  });

  it("recovers from a corrupt saved preference", () => {
    rememberRelease(readerId, "invalid");
    expect(hasNewRelease(readerId, "2026.44.5")).toBe(true);
  });
});

it("keeps an acknowledgement after Web Storage is cleared", () => {
  rememberRelease("cookie-fallback-reader", "2026.44.6");
  localStorage.clear();
  expect(hasNewRelease("cookie-fallback-reader", "2026.44.6")).toBe(false);
});

it("recognizes acknowledgements saved with the old user href key", () => {
  localStorage.setItem(
    "pulpit:last-seen-release:/pulp/api/v3/users/legacy/",
    "2026.44.6",
  );
  expect(
    hasNewRelease("prn:core.user:legacy", "2026.44.6", "/pulp/api/v3/users/legacy/"),
  ).toBe(false);
});

it("does not overwrite a newer acknowledged version during a rollback", () => {
  rememberRelease("rollback-reader", "2026.44.9");
  rememberRelease("rollback-reader", "2026.44.6");
  expect(hasNewRelease("rollback-reader", "2026.44.9")).toBe(false);
});

it("ignores a stale storage snapshot when its cookie remembers a newer release", () => {
  rememberRelease("stale-storage-reader", "2026.44.6");
  localStorage.setItem("pulpit:last-seen-release:stale-storage-reader", "2026.43.2");
  expect(hasNewRelease("stale-storage-reader", "2026.44.6")).toBe(false);
});
