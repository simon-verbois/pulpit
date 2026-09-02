import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { CONTAINER_REMOTE_FIXTURE } from "../../../test/handlers";
import {
  createContainerRemote,
  deleteContainerRemote,
  listAllContainerRemotes,
  listContainerRemotes,
  updateContainerRemote,
} from "./remotes";

const BASE = "/pulp/api/v3/remotes/container/container/";

describe("container remotes adapter", () => {
  it("lists remotes with limit/offset in the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [CONTAINER_REMOTE_FIXTURE],
        });
      }),
    );

    const page = await listContainerRemotes({ limit: 10, offset: 0 });

    expect(requestedUrl).toContain("limit=10");
    expect(page.results).toEqual([CONTAINER_REMOTE_FIXTURE]);
  });

  it("fetches every page for listAllContainerRemotes", async () => {
    const remotes = await listAllContainerRemotes();
    expect(remotes).toEqual([CONTAINER_REMOTE_FIXTURE]);
  });

  it(
    "creates a remote with upstream_name (required, unlike RPM/Ansible remotes) - " +
      "VERIFIED live: 201, synchronous",
    async () => {
      let requestBody: unknown;
      server.use(
        http.post(BASE, async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json(
            { ...CONTAINER_REMOTE_FIXTURE, pulp_href: `${BASE}new/` },
            { status: 201 },
          );
        }),
      );

      const remote = await createContainerRemote({
        name: "new-remote",
        url: "https://ghcr.io",
        upstream_name: "pulp/hello-world",
      });

      expect(requestBody).toMatchObject({ upstream_name: "pulp/hello-world" });
      expect(remote.name).toBe(CONTAINER_REMOTE_FIXTURE.name);
    },
  );

  it("deletes a remote asynchronously (202 + task)", async () => {
    const result = await deleteContainerRemote(CONTAINER_REMOTE_FIXTURE.pulp_href);
    expect(result.task).toBeDefined();
  });

  it("updates a remote asynchronously (202 + task)", async () => {
    const result = await updateContainerRemote(CONTAINER_REMOTE_FIXTURE.pulp_href, {
      includes: ["latest"],
    });
    expect(result.task).toBeDefined();
  });
});
