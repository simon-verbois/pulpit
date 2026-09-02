import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import {
  createRoleRemote,
  deleteRoleRemote,
  listRoleRemotes,
  updateRoleRemote,
} from "./roleRemotes";

const BASE = "/pulp/api/v3/remotes/ansible/role/";

const REMOTE_FIXTURE = {
  pulp_href: `${BASE}remote-1/`,
  name: "test-role-remote",
  url: "https://galaxy.ansible.com/api/v1/roles/",
  policy: "immediate",
  pulp_created: "2026-08-30T10:00:00.000000Z",
  proxy_url: null,
  tls_validation: true,
  hidden_fields: [],
};

describe("ansible role remotes adapter", () => {
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

    const page = await listRoleRemotes({ limit: 10, offset: 0 });
    expect(requestedUrl).toContain("limit=10");
    expect(page.results).toEqual([REMOTE_FIXTURE]);
  });

  it("creates a remote synchronously (201, no task) - same shape as a standard RPM remote", async () => {
    server.use(http.post(BASE, () => HttpResponse.json(REMOTE_FIXTURE, { status: 201 })));
    const remote = await createRoleRemote({
      name: "test-role-remote",
      url: "https://galaxy.ansible.com/api/v1/roles/",
    });
    expect(remote.name).toBe("test-role-remote");
  });

  it("updates a remote asynchronously (202 + task)", async () => {
    server.use(
      http.patch(`${BASE}:id/`, () =>
        HttpResponse.json({ task: "/pulp/api/v3/tasks/update-task/" }, { status: 202 }),
      ),
    );
    const result = await updateRoleRemote(REMOTE_FIXTURE.pulp_href, {
      policy: "on_demand",
    });
    expect(result.task).toBe("/pulp/api/v3/tasks/update-task/");
  });

  it("deletes a remote and returns a task href", async () => {
    server.use(
      http.delete(`${BASE}:id/`, () =>
        HttpResponse.json({ task: "/pulp/api/v3/tasks/delete-task/" }, { status: 202 }),
      ),
    );
    const result = await deleteRoleRemote(REMOTE_FIXTURE.pulp_href);
    expect(result.task).toBe("/pulp/api/v3/tasks/delete-task/");
  });
});
