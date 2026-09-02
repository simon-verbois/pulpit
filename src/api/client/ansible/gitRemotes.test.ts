import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import {
  createGitRemote,
  deleteGitRemote,
  listGitRemotes,
  updateGitRemote,
} from "./gitRemotes";

const BASE = "/pulp/api/v3/remotes/ansible/git/";

const REMOTE_FIXTURE = {
  pulp_href: `${BASE}remote-1/`,
  name: "test-git-remote",
  url: "https://github.com/example/role.git",
  pulp_created: "2026-08-30T10:00:00.000000Z",
  proxy_url: null,
  tls_validation: true,
  hidden_fields: [],
  git_ref: "main",
  metadata_only: false,
};

describe("ansible git remotes adapter", () => {
  it("lists remotes with limit/offset in the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [REMOTE_FIXTURE],
        });
      }),
    );

    const page = await listGitRemotes({ limit: 10, offset: 0 });
    expect(requestedUrl).toContain("limit=10");
    expect(page.results).toEqual([REMOTE_FIXTURE]);
  });

  it("creates a remote synchronously (201, no task), including git_ref/metadata_only - no policy field", async () => {
    let requestBody: unknown;
    server.use(
      http.post(BASE, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(REMOTE_FIXTURE, { status: 201 });
      }),
    );

    await createGitRemote({
      name: "test-git-remote",
      url: "https://github.com/example/role.git",
      git_ref: "main",
      metadata_only: false,
    });

    expect(requestBody).toEqual({
      name: "test-git-remote",
      url: "https://github.com/example/role.git",
      git_ref: "main",
      metadata_only: false,
    });
  });

  it("updates a remote asynchronously (202 + task)", async () => {
    server.use(
      http.patch(`${BASE}:id/`, () =>
        HttpResponse.json({ task: "/pulp/api/v3/tasks/update-task/" }, { status: 202 }),
      ),
    );
    const result = await updateGitRemote(REMOTE_FIXTURE.pulp_href, { git_ref: "v2.0" });
    expect(result.task).toBe("/pulp/api/v3/tasks/update-task/");
  });

  it("deletes a remote and returns a task href", async () => {
    server.use(
      http.delete(`${BASE}:id/`, () =>
        HttpResponse.json({ task: "/pulp/api/v3/tasks/delete-task/" }, { status: 202 }),
      ),
    );
    const result = await deleteGitRemote(REMOTE_FIXTURE.pulp_href);
    expect(result.task).toBe("/pulp/api/v3/tasks/delete-task/");
  });
});
