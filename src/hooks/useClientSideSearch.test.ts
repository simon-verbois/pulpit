import { describe, expect, it } from "vitest";

import { useClientSideSearch } from "./useClientSideSearch";

interface Item {
  name: string;
}

const ITEMS: Item[] = [
  { name: "zebra" },
  { name: "wolf" },
  { name: "whale" },
  { name: "walrus" },
];

const byName = (item: Item) => item.name;

describe("useClientSideSearch", () => {
  it("returns every item unfiltered when there is no search text", () => {
    const { paged, totalCount } = useClientSideSearch(ITEMS, "", byName, {
      limit: 20,
      offset: 0,
    });

    expect(totalCount).toBe(4);
    expect(paged.map(byName)).toEqual(["zebra", "wolf", "whale", "walrus"]);
  });

  it("filters to items whose text contains the search substring, case-insensitively", () => {
    const { paged, totalCount } = useClientSideSearch(ITEMS, "WOL", byName, {
      limit: 20,
      offset: 0,
    });

    expect(totalCount).toBe(1);
    expect(paged.map(byName)).toEqual(["wolf"]);
  });

  it("matches a substring anywhere in the text, not just a prefix", () => {
    const { paged, totalCount } = useClientSideSearch(ITEMS, "al", byName, {
      limit: 20,
      offset: 0,
    });

    expect(totalCount).toBe(2);
    expect(paged.map(byName)).toEqual(["whale", "walrus"]);
  });

  it("paginates the filtered results, not the full list", () => {
    const { paged, totalCount } = useClientSideSearch(ITEMS, "", byName, {
      limit: 2,
      offset: 2,
    });

    expect(totalCount).toBe(4);
    expect(paged.map(byName)).toEqual(["whale", "walrus"]);
  });

  it("treats undefined items as an empty list instead of throwing", () => {
    const { paged, totalCount } = useClientSideSearch<Item>(undefined, "wol", byName, {
      limit: 20,
      offset: 0,
    });

    expect(totalCount).toBe(0);
    expect(paged).toEqual([]);
  });
});
