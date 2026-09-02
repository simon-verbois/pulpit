import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { CONTAINER_MANIFEST_FIXTURE } from "../../../test/handlers";
import { listContainerManifests } from "./manifests";

const BASE = "/pulp/api/v3/content/container/manifests/";

describe("container manifests adapter", () => {
  it("lists manifests filtered by repository_version", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [CONTAINER_MANIFEST_FIXTURE],
        });
      }),
    );

    const page = await listContainerManifests({
      limit: 10,
      offset: 0,
      repository_version: "/some/version/1/",
    });

    expect(requestedUrl).toContain(
      `repository_version=${encodeURIComponent("/some/version/1/")}`,
    );
    expect(page.results).toEqual([CONTAINER_MANIFEST_FIXTURE]);
  });
});
