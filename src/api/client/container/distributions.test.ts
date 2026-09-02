import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import {
  CONTAINER_DISTRIBUTION_FIXTURE,
  CONTAINER_REPO_FIXTURE,
} from "../../../test/handlers";
import {
  createContainerDistribution,
  deleteContainerDistribution,
  listContainerDistributions,
} from "./distributions";

const BASE = "/pulp/api/v3/distributions/container/container/";

describe("container distributions adapter", () => {
  it("lists distributions filtered by repository", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [CONTAINER_DISTRIBUTION_FIXTURE],
        });
      }),
    );

    const page = await listContainerDistributions({
      limit: 10,
      offset: 0,
      repository: CONTAINER_REPO_FIXTURE.pulp_href,
    });

    expect(requestedUrl).toContain(
      `repository=${encodeURIComponent(CONTAINER_REPO_FIXTURE.pulp_href)}`,
    );
    expect(page.results).toEqual([CONTAINER_DISTRIBUTION_FIXTURE]);
  });

  it("creates a distribution asynchronously (VERIFIED live: 202 + task, unlike RPM's sync create)", async () => {
    const result = await createContainerDistribution({
      name: "new-dist",
      base_path: "new-dist",
      repository: CONTAINER_REPO_FIXTURE.pulp_href,
    });
    expect(result.task).toBeDefined();
  });

  it("deletes a distribution asynchronously (202 + task)", async () => {
    const result = await deleteContainerDistribution(
      CONTAINER_DISTRIBUTION_FIXTURE.pulp_href,
    );
    expect(result.task).toBeDefined();
  });
});
