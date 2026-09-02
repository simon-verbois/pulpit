import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import {
  createAnsibleDistribution,
  deleteAnsibleDistribution,
  listAllAnsibleDistributions,
  listAnsibleDistributions,
} from "./distributions";

const BASE = "/pulp/api/v3/distributions/ansible/ansible/";

const DIST_FIXTURE = {
  pulp_href: `${BASE}dist-1/`,
  name: "test-dist",
  base_path: "test-dist",
  repository: "/pulp/api/v3/repositories/ansible/ansible/repo-1/",
  repository_version: null,
  client_url: "https://pulp.example.com/pulp_ansible/galaxy/test-dist/",
  pulp_created: "2026-08-30T10:00:00.000000Z",
};

describe("ansible distributions adapter", () => {
  it("lists distributions filtered by repository", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [DIST_FIXTURE],
        });
      }),
    );

    const page = await listAnsibleDistributions({
      limit: 10,
      offset: 0,
      repository: DIST_FIXTURE.repository,
    });
    expect(requestedUrl).toContain(encodeURIComponent(DIST_FIXTURE.repository));
    expect(page.results).toEqual([DIST_FIXTURE]);
  });

  it("fetches every page for listAllAnsibleDistributions", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [DIST_FIXTURE],
        }),
      ),
    );
    expect(await listAllAnsibleDistributions()).toEqual([DIST_FIXTURE]);
  });

  it("creates a distribution asynchronously (VERIFIED live: 202 + task, unlike repositories/remotes)", async () => {
    server.use(
      http.post(BASE, () =>
        HttpResponse.json({ task: "/pulp/api/v3/tasks/create-task/" }, { status: 202 }),
      ),
    );
    const result = await createAnsibleDistribution({
      name: "test-dist",
      base_path: "test-dist",
      repository: DIST_FIXTURE.repository,
    });
    expect(result.task).toBe("/pulp/api/v3/tasks/create-task/");
  });

  it("deletes a distribution and returns a task href", async () => {
    server.use(
      http.delete(`${BASE}:id/`, () =>
        HttpResponse.json({ task: "/pulp/api/v3/tasks/delete-task/" }, { status: 202 }),
      ),
    );
    const result = await deleteAnsibleDistribution(DIST_FIXTURE.pulp_href);
    expect(result.task).toBe("/pulp/api/v3/tasks/delete-task/");
  });
});
