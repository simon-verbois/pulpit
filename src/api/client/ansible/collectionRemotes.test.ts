import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import {
  createCollectionRemote,
  deleteCollectionRemote,
  listAllCollectionRemotes,
  listCollectionRemotes,
  updateCollectionRemote,
} from "./collectionRemotes";

const BASE = "/pulp/api/v3/remotes/ansible/collection/";

const REMOTE_FIXTURE = {
  pulp_href: `${BASE}remote-1/`,
  name: "test-collection-remote",
  url: "https://galaxy.ansible.com/api/",
  policy: "immediate",
  pulp_created: "2026-08-30T10:00:00.000000Z",
  proxy_url: null,
  tls_validation: true,
  hidden_fields: [{ name: "token", is_set: false }],
  requirements_file: null,
  auth_url: null,
  sync_dependencies: false,
  signed_only: false,
  sync_highest_versions: null,
};

describe("ansible collection remotes adapter", () => {
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

    const page = await listCollectionRemotes({ limit: 10, offset: 0 });
    expect(requestedUrl).toContain("limit=10");
    expect(page.results).toEqual([REMOTE_FIXTURE]);
  });

  it("fetches every page for listAllCollectionRemotes", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [REMOTE_FIXTURE],
        }),
      ),
    );
    expect(await listAllCollectionRemotes()).toEqual([REMOTE_FIXTURE]);
  });

  it("creates a remote synchronously (201, no task), including requirements_file/token", async () => {
    let requestBody: unknown;
    server.use(
      http.post(BASE, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(REMOTE_FIXTURE, { status: 201 });
      }),
    );

    await createCollectionRemote({
      name: "test-collection-remote",
      url: "https://galaxy.ansible.com/api/",
      requirements_file: "collections:\n  - name: community.general",
      token: "secret-token",
    });

    expect(requestBody).toMatchObject({
      requirements_file: "collections:\n  - name: community.general",
      token: "secret-token",
    });
  });

  it("updates a remote asynchronously (202 + task)", async () => {
    server.use(
      http.patch(`${BASE}:id/`, () =>
        HttpResponse.json({ task: "/pulp/api/v3/tasks/update-task/" }, { status: 202 }),
      ),
    );
    const result = await updateCollectionRemote(REMOTE_FIXTURE.pulp_href, {
      signed_only: true,
    });
    expect(result.task).toBe("/pulp/api/v3/tasks/update-task/");
  });

  it("deletes a remote and returns a task href", async () => {
    server.use(
      http.delete(`${BASE}:id/`, () =>
        HttpResponse.json({ task: "/pulp/api/v3/tasks/delete-task/" }, { status: 202 }),
      ),
    );
    const result = await deleteCollectionRemote(REMOTE_FIXTURE.pulp_href);
    expect(result.task).toBe("/pulp/api/v3/tasks/delete-task/");
  });
});
