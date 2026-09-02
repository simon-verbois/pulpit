import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { CONTAINER_TAG_FIXTURE } from "../../../test/handlers";
import { listContainerTags } from "./tags";

const BASE = "/pulp/api/v3/content/container/tags/";

describe("container tags adapter", () => {
  it("lists tags with limit/offset in the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [CONTAINER_TAG_FIXTURE],
        });
      }),
    );

    const page = await listContainerTags({ limit: 10, offset: 0 });

    expect(requestedUrl).toContain("limit=10");
    expect(page.results).toEqual([CONTAINER_TAG_FIXTURE]);
  });

  it("omits an undefined repository_version filter from the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
      }),
    );

    await listContainerTags({ limit: 10, offset: 0, repository_version: undefined });

    expect(requestedUrl).not.toContain("repository_version");
  });
});
