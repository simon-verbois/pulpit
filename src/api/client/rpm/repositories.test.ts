import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { RPM_REPO_FIXTURE, RPM_VERSION_FIXTURES } from "../../../test/handlers";
import {
  createRpmRepository,
  deleteRepositoryVersion,
  deleteRpmRepository,
  getRpmRepository,
  getRpmRepositoryByName,
  listAllRpmRepositories,
  listRepositoryVersions,
  listRpmRepositories,
  modifyRpmRepository,
  syncRpmRepository,
  updateRpmRepository,
} from "./repositories";

const BASE = "/pulp/api/v3/repositories/rpm/rpm/";

describe("rpm repositories adapter", () => {
  it("lists repositories with limit/offset in the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [RPM_REPO_FIXTURE],
        });
      }),
    );

    const page = await listRpmRepositories({ limit: 10, offset: 20 });

    expect(requestedUrl).toContain("limit=10");
    expect(requestedUrl).toContain("offset=20");
    expect(page.results).toEqual([RPM_REPO_FIXTURE]);
  });

  it("omits undefined optional filters from the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
      }),
    );

    await listRpmRepositories({ limit: 10, offset: 0, name__icontains: undefined });

    expect(requestedUrl).not.toContain("name__icontains");
  });

  it("looks up a repository by exact name and returns the first result", async () => {
    const repo = await getRpmRepositoryByName("test-repo");
    expect(repo).toEqual(RPM_REPO_FIXTURE);
  });

  it("returns null (not undefined) when no repository matches the name", async () => {
    // Not undefined: TanStack Query treats a queryFn resolving to undefined
    // as an error, which would break RepositoryDetailPage's not-found state.
    const repo = await getRpmRepositoryByName("does-not-exist");
    expect(repo).toBeNull();
  });

  it("fetches every page for listAllRpmRepositories", async () => {
    const all = await listAllRpmRepositories();
    expect(all).toEqual([RPM_REPO_FIXTURE]);
  });

  it("fetches a single repository by href", async () => {
    const repo = await getRpmRepository(RPM_REPO_FIXTURE.pulp_href);
    expect(repo.name).toBe("test-repo");
  });

  it("creates a repository synchronously (201, no task)", async () => {
    const repo = await createRpmRepository({ name: "new-repo" });
    expect(repo.name).toBe("new-repo");
    expect(repo.pulp_href).toBeTruthy();
  });

  it("updates a repository asynchronously (202 + task, unlike create)", async () => {
    let requestBody: unknown;
    server.use(
      http.patch(`${BASE}:id/`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/update-task/" },
          { status: 202 },
        );
      }),
    );

    const result = await updateRpmRepository(RPM_REPO_FIXTURE.pulp_href, {
      description: "new description",
    });

    expect(requestBody).toEqual({ description: "new description" });
    expect(result.task).toBe("/pulp/api/v3/tasks/update-task/");
  });

  it("deletes a repository and returns a task href", async () => {
    const result = await deleteRpmRepository(RPM_REPO_FIXTURE.pulp_href);
    expect(result.task).toMatch(/^\/pulp\/api\/v3\/tasks\//);
  });

  it("syncs a repository against the sync/ sub-route", async () => {
    let requestBody: unknown;
    server.use(
      http.post(`${BASE}:id/sync/`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/sync-task/" },
          { status: 202 },
        );
      }),
    );

    const result = await syncRpmRepository(RPM_REPO_FIXTURE.pulp_href, { mirror: true });

    expect(result.task).toBe("/pulp/api/v3/tasks/sync-task/");
    expect(requestBody).toEqual({ mirror: true });
  });

  it("modifies a repository against the modify/ sub-route", async () => {
    let requestBody: unknown;
    server.use(
      http.post(`${BASE}:id/modify/`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/modify-task/" },
          { status: 202 },
        );
      }),
    );

    await modifyRpmRepository(RPM_REPO_FIXTURE.pulp_href, {
      add_content_units: ["/pkg/1/"],
    });

    expect(requestBody).toEqual({ add_content_units: ["/pkg/1/"] });
  });

  it("lists versions for a repository's versions href", async () => {
    const page = await listRepositoryVersions(RPM_REPO_FIXTURE.versions_href, {
      limit: 10,
      offset: 0,
    });
    expect(page.results).toEqual(RPM_VERSION_FIXTURES);
  });

  it("deletes a repository version and returns a task href", async () => {
    const result = await deleteRepositoryVersion(RPM_VERSION_FIXTURES[0].pulp_href);
    expect(result.task).toMatch(/^\/pulp\/api\/v3\/tasks\//);
  });
});
