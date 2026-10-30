import { describe, expect, it } from "vitest";
import { loginDestination } from "./loginDestination";

describe("login return route", () => {
  it.each([
    null,
    "",
    "https://example.invalid",
    "//example.invalid",
    "/\\example.invalid",
    "/%2fexample.invalid",
    "/%5cexample.invalid",
    "/%0a/remote",
    "javascript:alert(1)",
    "/login?next=/login",
    "/bad%escape",
  ])("rejects unsafe destination %s", (next) => {
    expect(loginDestination(next)).toBe("/");
  });
  it("preserves local paths, search parameters, hashes and escaped repository names", () => {
    const next = "/rpm/repositories/a%20b?tab=versions#latest";
    expect(loginDestination(next)).toBe(next);
  });
});
