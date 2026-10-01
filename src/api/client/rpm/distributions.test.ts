import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { RPM_DISTRIBUTION_FIXTURE, RPM_REPO_FIXTURE } from "../../../test/handlers";
import { server } from "../../../test/mswServer";
import {
  createRpmDistribution,
  deleteRpmDistribution,
  listRpmDistributions,
  listRpmRepositoryDistributions,
} from "./distributions";

const BASE = "/pulp/api/v3/distributions/rpm/rpm/";

describe("rpm distributions adapter", () => {
  it("lists distributions", async () => {
    const page = await listRpmDistributions({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_DISTRIBUTION_FIXTURE]);
  });

  it("includes distributions pinned through a publication", async () => {
    const pinned = {
      ...RPM_DISTRIBUTION_FIXTURE,
      pulp_href: `${BASE}pinned/`,
      name: "pinned",
      repository: null,
      publication: "/pulp/api/v3/publications/rpm/rpm/publication-1/",
    };
    const unrelated = {
      ...pinned,
      pulp_href: `${BASE}unrelated/`,
      name: "unrelated",
      publication: "/pulp/api/v3/publications/rpm/rpm/publication-2/",
    };
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({
          count: 3,
          next: null,
          previous: null,
          results: [RPM_DISTRIBUTION_FIXTURE, pinned, unrelated],
        }),
      ),
      http.get("/pulp/api/v3/publications/rpm/rpm/", () =>
        HttpResponse.json({
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: pinned.publication,
              repository: RPM_REPO_FIXTURE.pulp_href,
              repository_version: `${RPM_REPO_FIXTURE.versions_href}0/`,
            },
            {
              pulp_href: unrelated.publication,
              repository: "/pulp/api/v3/repositories/rpm/rpm/another/",
              repository_version: "/pulp/api/v3/repositories/rpm/rpm/another/versions/0/",
            },
          ],
        }),
      ),
    );

    const page = await listRpmRepositoryDistributions({
      repository: RPM_REPO_FIXTURE.pulp_href,
      limit: 10,
      offset: 0,
    });

    expect(page.count).toBe(2);
    expect(page.results.map((distribution) => distribution.name)).toEqual([
      RPM_DISTRIBUTION_FIXTURE.name,
      "pinned",
    ]);
  });

  it("creates a distribution asynchronously (202 + task, unlike repositories/remotes)", async () => {
    const result = await createRpmDistribution({
      name: "new-dist",
      base_path: "new-dist",
      repository: RPM_REPO_FIXTURE.pulp_href,
    });

    expect(result.task).toMatch(/^\/pulp\/api\/v3\/tasks\//);
  });

  it("can create a distribution pinned to a publication", async () => {
    let requestBody: unknown;
    server.use(
      http.post("/pulp/api/v3/distributions/rpm/rpm/", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/create-pinned-distribution/" },
          { status: 202 },
        );
      }),
    );

    await createRpmDistribution({
      name: "stable",
      base_path: "rpm/stable",
      publication: "/pulp/api/v3/publications/rpm/rpm/publication-1/",
    });

    expect(requestBody).toEqual({
      name: "stable",
      base_path: "rpm/stable",
      publication: "/pulp/api/v3/publications/rpm/rpm/publication-1/",
    });
  });

  it("deletes a distribution and returns a task href", async () => {
    const result = await deleteRpmDistribution(RPM_DISTRIBUTION_FIXTURE.pulp_href);
    expect(result.task).toMatch(/^\/pulp\/api\/v3\/tasks\//);
  });
});
