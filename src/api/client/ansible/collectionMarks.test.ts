import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { listCollectionMarks } from "./collectionMarks";

const BASE = "/pulp/api/v3/content/ansible/collection_marks/";

describe("ansible collection marks adapter", () => {
  it("lists marks filtered by repository_version - read-only, created via the repository mark/unmark actions", async () => {
    let requestedUrl = "";
    const fixture = {
      pulp_href: `${BASE}mark-1/`,
      marked_collection: "/pulp/api/v3/content/ansible/collection_versions/cv-1/",
      value: "certified",
      pulp_created: "2026-08-30T10:00:00.000000Z",
    };
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [fixture],
        });
      }),
    );

    const page = await listCollectionMarks({
      limit: 10,
      offset: 0,
      repository_version: "/pulp/api/v3/repositories/ansible/ansible/repo-1/versions/1/",
    });
    expect(requestedUrl).toContain("repository_version=");
    expect(page.results).toEqual([fixture]);
  });
});
