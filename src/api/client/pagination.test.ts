import { describe, expect, it } from "vitest";
import { collectPulpPages } from "./pagination";

describe("complete Pulp pagination", () => {
  it("keeps results beyond the first page even when the server caps page size", async () => {
    const records = Array.from({ length: 205 }, (_, id) => ({ id }));
    const offsets: number[] = [];
    const result = await collectPulpPages(async (offset) => {
      offsets.push(offset);
      return {
        count: records.length,
        previous: null,
        next: offset + 73 < records.length ? "next" : null,
        results: records.slice(offset, offset + 73),
      };
    });
    expect(result).toEqual(records);
    expect(offsets).toEqual([0, 73, 146]);
  });
  it("fails visibly rather than returning a truncated catalog when pagination stalls", async () => {
    await expect(
      collectPulpPages(async () => ({
        count: 200,
        previous: null,
        next: "next",
        results: [],
      })),
    ).rejects.toThrow("empty page");
  });
});
