import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { copyAnsibleContent } from "./copy";

describe("ansible copy adapter", () => {
  it("sends a single source_repo_version/dest_repo config entry, same shape as RPM's copy adapter", async () => {
    let requestBody: unknown;
    server.use(
      http.post("/pulp/api/v3/ansible/copy/", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/copy-task/" },
          { status: 202 },
        );
      }),
    );

    const result = await copyAnsibleContent(
      "/pulp/api/v3/repositories/ansible/ansible/source-repo/versions/1/",
      "/pulp/api/v3/repositories/ansible/ansible/dest-repo/",
    );

    expect(requestBody).toEqual({
      config: [
        {
          source_repo_version:
            "/pulp/api/v3/repositories/ansible/ansible/source-repo/versions/1/",
          dest_repo: "/pulp/api/v3/repositories/ansible/ansible/dest-repo/",
        },
      ],
    });
    expect(result.task).toBe("/pulp/api/v3/tasks/copy-task/");
  });
});
