import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import {
  createAnsibleRepository,
  deleteAnsibleRepository,
  getAnsibleRepositoryByName,
  listAnsibleRepositories,
  markAnsibleRepositoryContent,
  signAnsibleRepositoryContent,
  syncAnsibleRepository,
  unmarkAnsibleRepositoryContent,
  updateAnsibleRepository,
} from "./repositories";

const BASE = "/pulp/api/v3/repositories/ansible/ansible/";

const REPO_FIXTURE = {
  pulp_href: `${BASE}repo-1/`,
  name: "test-ansible-repo",
  description: null,
  remote: null,
  retain_repo_versions: null,
  gpgkey: null,
  private: false,
  versions_href: `${BASE}repo-1/versions/`,
  latest_version_href: `${BASE}repo-1/versions/0/`,
  pulp_created: "2026-08-30T10:00:00.000000Z",
};

describe("ansible repositories adapter", () => {
  it("lists repositories with limit/offset in the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [REPO_FIXTURE],
        });
      }),
    );

    const page = await listAnsibleRepositories({ limit: 10, offset: 20 });

    expect(requestedUrl).toContain("limit=10");
    expect(requestedUrl).toContain("offset=20");
    expect(page.results).toEqual([REPO_FIXTURE]);
  });

  it("looks up a repository by exact name, returning null (not undefined) when absent", async () => {
    server.use(
      http.get(BASE, ({ request }) => {
        const name = new URL(request.url).searchParams.get("name");
        const results = name === REPO_FIXTURE.name ? [REPO_FIXTURE] : [];
        return HttpResponse.json({
          count: results.length,
          next: null,
          previous: null,
          results,
        });
      }),
    );

    expect(await getAnsibleRepositoryByName(REPO_FIXTURE.name)).toEqual(REPO_FIXTURE);
    expect(await getAnsibleRepositoryByName("missing")).toBeNull();
  });

  it("creates a repository synchronously (201, no task)", async () => {
    server.use(http.post(BASE, () => HttpResponse.json(REPO_FIXTURE, { status: 201 })));

    const repo = await createAnsibleRepository({ name: REPO_FIXTURE.name });
    expect(repo.name).toBe(REPO_FIXTURE.name);
  });

  it("updates a repository asynchronously (202 + task), same as create-vs-update elsewhere", async () => {
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

    const result = await updateAnsibleRepository(REPO_FIXTURE.pulp_href, {
      private: true,
    });

    expect(requestBody).toEqual({ private: true });
    expect(result.task).toBe("/pulp/api/v3/tasks/update-task/");
  });

  it("deletes a repository and returns a task href", async () => {
    server.use(
      http.delete(`${BASE}:id/`, () =>
        HttpResponse.json({ task: "/pulp/api/v3/tasks/delete-task/" }, { status: 202 }),
      ),
    );
    const result = await deleteAnsibleRepository(REPO_FIXTURE.pulp_href);
    expect(result.task).toBe("/pulp/api/v3/tasks/delete-task/");
  });

  it("syncs against the sync/ sub-route with mirror/optimize options", async () => {
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

    await syncAnsibleRepository(REPO_FIXTURE.pulp_href, { mirror: true });
    expect(requestBody).toEqual({ mirror: true });
  });

  it("signs content against the sign/ sub-route", async () => {
    let requestBody: unknown;
    server.use(
      http.post(`${BASE}:id/sign/`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/sign-task/" },
          { status: 202 },
        );
      }),
    );

    await signAnsibleRepositoryContent(REPO_FIXTURE.pulp_href, {
      content_units: ["*"],
      signing_service: "/pulp/api/v3/signing-services/svc-1/",
    });
    expect(requestBody).toEqual({
      content_units: ["*"],
      signing_service: "/pulp/api/v3/signing-services/svc-1/",
    });
  });

  it("marks and unmarks content against their own sub-routes", async () => {
    let markBody: unknown;
    let unmarkBody: unknown;
    server.use(
      http.post(`${BASE}:id/mark/`, async ({ request }) => {
        markBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/mark-task/" },
          { status: 202 },
        );
      }),
      http.post(`${BASE}:id/unmark/`, async ({ request }) => {
        unmarkBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/unmark-task/" },
          { status: 202 },
        );
      }),
    );

    await markAnsibleRepositoryContent(REPO_FIXTURE.pulp_href, {
      content_units: ["*"],
      value: "certified",
    });
    await unmarkAnsibleRepositoryContent(REPO_FIXTURE.pulp_href, {
      content_units: ["*"],
      value: "certified",
    });

    expect(markBody).toEqual({ content_units: ["*"], value: "certified" });
    expect(unmarkBody).toEqual({ content_units: ["*"], value: "certified" });
  });
});
