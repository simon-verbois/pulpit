import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import {
  deprecateCollection,
  listCollectionDeprecations,
} from "./collectionDeprecations";

const BASE = "/pulp/api/v3/content/ansible/collection_deprecations/";

describe("ansible collection deprecations adapter", () => {
  it("lists deprecations", async () => {
    const fixture = {
      pulp_href: `${BASE}dep-1/`,
      namespace: "pulpit_test",
      name: "demo",
      pulp_created: "2026-08-30T10:00:00.000000Z",
    };
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({ count: 1, next: null, previous: null, results: [fixture] }),
      ),
    );

    const page = await listCollectionDeprecations({ limit: 10, offset: 0 });
    expect(page.results).toEqual([fixture]);
  });

  it("deprecates a namespace+name collection asynchronously (VERIFIED live: 202 + task)", async () => {
    let requestBody: unknown;
    server.use(
      http.post(BASE, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/deprecate-task/" },
          { status: 202 },
        );
      }),
    );

    const result = await deprecateCollection({
      namespace: "pulpit_test",
      name: "demo",
      repository: "/pulp/api/v3/repositories/ansible/ansible/repo-1/",
    });

    expect(requestBody).toEqual({
      namespace: "pulpit_test",
      name: "demo",
      repository: "/pulp/api/v3/repositories/ansible/ansible/repo-1/",
    });
    expect(result.task).toBe("/pulp/api/v3/tasks/deprecate-task/");
  });
});
