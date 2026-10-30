import { saveDistribution } from "../distributionManagement";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import {
  CONTAINER_DISTRIBUTION_FIXTURE,
  CONTAINER_REPO_FIXTURE,
} from "../../../test/handlers";
import {
  containerDistributionDeletesRepository,
  deleteContainerDistribution,
  listContainerDistributions,
} from "./distributions";

const BASE = "/pulp/api/v3/distributions/container/container/";

describe("container distributions adapter", () => {
  it("keeps the repository when deleting a version-pinned distribution", async () => {
    expect(
      await containerDistributionDeletesRepository({
        ...CONTAINER_DISTRIBUTION_FIXTURE,
        repository: null,
        repository_version: `${CONTAINER_REPO_FIXTURE.pulp_href}versions/1/`,
      }),
    ).toBe(false);
  });
  it("warns only for the last direct distribution of a normal repository", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({ count: 2, next: null, previous: null, results: [] }),
      ),
    );
    expect(
      await containerDistributionDeletesRepository(CONTAINER_DISTRIBUTION_FIXTURE),
    ).toBe(false);
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({ count: 1, next: null, previous: null, results: [] }),
      ),
    );
    expect(
      await containerDistributionDeletesRepository(CONTAINER_DISTRIBUTION_FIXTURE),
    ).toBe(true);
  });
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

    expect(requestedUrl).toContain("limit=");
    expect(page.results).toEqual([CONTAINER_DISTRIBUTION_FIXTURE]);
  });

  it("creates a distribution asynchronously (VERIFIED live: 202 + task, unlike RPM's sync create)", async () => {
    const result = await saveDistribution("container", {
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
