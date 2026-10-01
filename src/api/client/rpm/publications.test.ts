import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { createRpmPublication, listRpmPublicationsByHrefs } from "./publications";

const BASE = "/pulp/api/v3/publications/rpm/rpm/";

describe("rpm publications adapter", () => {
  it("resolves a selected set of publication hrefs in one filtered request", async () => {
    let query = new URLSearchParams();
    server.use(
      http.get(BASE, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: `${BASE}publication-1/`,
              repository: "/pulp/api/v3/repositories/rpm/rpm/repo-1/",
              repository_version: "/pulp/api/v3/repositories/rpm/rpm/repo-1/versions/2/",
            },
          ],
        });
      }),
    );

    const publications = await listRpmPublicationsByHrefs([
      `${BASE}publication-1/`,
      `${BASE}publication-1/`,
    ]);

    expect(query.get("pulp_href__in")).toBe(`${BASE}publication-1/`);
    expect(query.get("fields")).toBe("pulp_href,repository,repository_version");
    expect(publications).toHaveLength(1);
  });

  it("publishes a repository asynchronously (202 + task)", async () => {
    let requestBody: unknown;
    server.use(
      http.post(BASE, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/publish-task/" },
          { status: 202 },
        );
      }),
    );

    const result = await createRpmPublication({
      repository: "/pulp/api/v3/repositories/rpm/rpm/repo-1/",
    });

    expect(requestBody).toEqual({
      repository: "/pulp/api/v3/repositories/rpm/rpm/repo-1/",
    });
    expect(result.task).toBe("/pulp/api/v3/tasks/publish-task/");
  });

  it("publishes one specific repository version", async () => {
    let requestBody: unknown;
    server.use(
      http.post(BASE, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/publish-version-task/" },
          { status: 202 },
        );
      }),
    );

    await createRpmPublication({
      repository_version: "/pulp/api/v3/repositories/rpm/rpm/repo-1/versions/12/",
    });

    expect(requestBody).toEqual({
      repository_version: "/pulp/api/v3/repositories/rpm/rpm/repo-1/versions/12/",
    });
  });
});
