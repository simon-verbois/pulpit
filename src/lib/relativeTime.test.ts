import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./relativeTime";

describe("formatRelativeTime", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("shows 'just now' for very recent timestamps", () => {
    expect(formatRelativeTime("2026-01-01T11:59:57Z", now)).toBe("just now");
  });

  it("shows minutes for timestamps within the last hour", () => {
    expect(formatRelativeTime("2026-01-01T11:58:00Z", now)).toBe("2 minutes ago");
  });

  it("shows hours for timestamps within the last day", () => {
    expect(formatRelativeTime("2026-01-01T09:00:00Z", now)).toBe("3 hours ago");
  });

  it("shows days for older timestamps", () => {
    expect(formatRelativeTime("2025-12-30T12:00:00Z", now)).toBe("2 days ago");
  });
});
