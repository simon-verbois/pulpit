import { describe, expect, it } from "vitest";

import { formatDuration } from "./duration";

describe("formatDuration", () => {
  const start = "2026-08-30T10:00:00.000Z";
  it.each([
    ["2026-08-30T10:00:00.850Z", "850 ms"],
    ["2026-08-30T10:00:42.000Z", "42 s"],
    ["2026-08-30T10:03:05.000Z", "3 min 05 s"],
    ["2026-08-30T11:02:00.000Z", "1 h 02 min"],
  ])("formats %s", (end, expected) => {
    expect(formatDuration(start, end)).toBe(expected);
  });
});
