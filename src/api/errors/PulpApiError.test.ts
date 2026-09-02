import { describe, expect, it } from "vitest";

import { classifyStatus } from "./PulpApiError";

describe("classifyStatus", () => {
  it.each([
    [401, "unauthenticated"],
    [403, "forbidden"],
    [404, "not-found"],
    [400, "validation"],
    [409, "conflict"],
    [500, "backend-unavailable"],
    [502, "backend-unavailable"],
    [418, "unknown"],
  ] as const)("maps %i to %s", (status, expected) => {
    expect(classifyStatus(status)).toBe(expected);
  });
});
