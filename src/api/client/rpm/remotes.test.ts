import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { RPM_REMOTE_FIXTURE } from "../../../test/handlers";
import {
  createRpmRemote,
  deleteRpmRemote,
  listAllRpmRemotes,
  listRpmRemotes,
  updateRpmRemote,
} from "./remotes";

const BASE = "/pulp/api/v3/remotes/rpm/rpm/";

describe("rpm remotes adapter", () => {
  it("lists remotes", async () => {
    const page = await listRpmRemotes({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_REMOTE_FIXTURE]);
  });

  it("fetches every page for listAllRpmRemotes", async () => {
    const all = await listAllRpmRemotes();
    expect(all).toEqual([RPM_REMOTE_FIXTURE]);
  });

  it("creates a remote synchronously (201, no task) with the chosen policy", async () => {
    let requestBody: unknown;
    server.use(
      http.post(BASE, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          {
            pulp_href: `${BASE}new/`,
            name: "new-remote",
            url: "https://example.com/",
            policy: "on_demand",
          },
          { status: 201 },
        );
      }),
    );

    const remote = await createRpmRemote({
      name: "new-remote",
      url: "https://example.com/",
      policy: "on_demand",
    });

    expect(requestBody).toEqual({
      name: "new-remote",
      url: "https://example.com/",
      policy: "on_demand",
    });
    expect(remote.policy).toBe("on_demand");
  });

  it("deletes a remote and returns a task href", async () => {
    const result = await deleteRpmRemote(RPM_REMOTE_FIXTURE.pulp_href);
    expect(result.task).toMatch(/^\/pulp\/api\/v3\/tasks\//);
  });

  it("updates a remote asynchronously (202 + task, unlike create)", async () => {
    let requestBody: unknown;
    server.use(
      http.patch(`${BASE}:id/`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/update-remote-task/" },
          { status: 202 },
        );
      }),
    );

    const result = await updateRpmRemote(RPM_REMOTE_FIXTURE.pulp_href, {
      proxy_url: "http://proxy.example.com:3128",
    });

    expect(requestBody).toEqual({ proxy_url: "http://proxy.example.com:3128" });
    expect(result.task).toBe("/pulp/api/v3/tasks/update-remote-task/");
  });
});
