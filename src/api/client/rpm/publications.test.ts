import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { createRpmPublication } from "./publications";

const BASE = "/pulp/api/v3/publications/rpm/rpm/";

describe("rpm publications adapter", () => {
  it("publishes a repository asynchronously (202 + task)", async () => {
    let requestBody: unknown;
    server.use(
      http.post(BASE, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/publish-task/" },
          { status: 202 },
        );
      }),
    );

    const result = await createRpmPublication(
      "/pulp/api/v3/repositories/rpm/rpm/repo-1/",
    );

    expect(requestBody).toEqual({
      repository: "/pulp/api/v3/repositories/rpm/rpm/repo-1/",
    });
    expect(result.task).toBe("/pulp/api/v3/tasks/publish-task/");
  });
});
