import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { copyRpmContent } from "./copy";

describe("rpm copy adapter", () => {
  it(
    "sends a single source_repo_version/dest_repo config entry " +
      "(VERIFIED live: returns a plain {task}, not {task_group})",
    async () => {
      let requestBody: unknown;
      server.use(
        http.post("/pulp/api/v3/rpm/copy/", async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json(
            { task: "/pulp/api/v3/tasks/copy-task/" },
            { status: 202 },
          );
        }),
      );

      const result = await copyRpmContent(
        "/pulp/api/v3/repositories/rpm/rpm/source-repo/versions/1/",
        "/pulp/api/v3/repositories/rpm/rpm/dest-repo/",
      );

      expect(requestBody).toEqual({
        config: [
          {
            source_repo_version:
              "/pulp/api/v3/repositories/rpm/rpm/source-repo/versions/1/",
            dest_repo: "/pulp/api/v3/repositories/rpm/rpm/dest-repo/",
          },
        ],
      });
      expect(result.task).toBe("/pulp/api/v3/tasks/copy-task/");
    },
  );
});
