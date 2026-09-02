import { describe, expect, it } from "vitest";

import { RPM_DISTRIBUTION_TREE_FIXTURE } from "../../../test/handlers";
import { listRpmDistributionTrees } from "./distributionTrees";

describe("rpm distribution trees adapter", () => {
  it("lists distribution trees", async () => {
    const page = await listRpmDistributionTrees({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_DISTRIBUTION_TREE_FIXTURE]);
  });
});
