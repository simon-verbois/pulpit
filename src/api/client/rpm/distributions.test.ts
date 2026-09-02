import { describe, expect, it } from "vitest";

import { RPM_DISTRIBUTION_FIXTURE, RPM_REPO_FIXTURE } from "../../../test/handlers";
import {
  createRpmDistribution,
  deleteRpmDistribution,
  listRpmDistributions,
} from "./distributions";

describe("rpm distributions adapter", () => {
  it("lists distributions", async () => {
    const page = await listRpmDistributions({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_DISTRIBUTION_FIXTURE]);
  });

  it("creates a distribution asynchronously (202 + task, unlike repositories/remotes)", async () => {
    const result = await createRpmDistribution({
      name: "new-dist",
      base_path: "new-dist",
      repository: RPM_REPO_FIXTURE.pulp_href,
    });

    expect(result.task).toMatch(/^\/pulp\/api\/v3\/tasks\//);
  });

  it("deletes a distribution and returns a task href", async () => {
    const result = await deleteRpmDistribution(RPM_DISTRIBUTION_FIXTURE.pulp_href);
    expect(result.task).toMatch(/^\/pulp\/api\/v3\/tasks\//);
  });
});
