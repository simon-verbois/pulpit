import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { RPM_REPO_FIXTURE } from "../../../test/handlers";
import { pruneRpmPackages } from "./prune";

const BASE = "/pulp/api/v3/rpm/prune/";

describe("rpm prune adapter", () => {
  it(
    "resolves the returned task_group to its first task " +
      "(VERIFIED live: prune returns {task_group}, not {task})",
    async () => {
      let requestBody: unknown;
      server.use(
        http.post(BASE, async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json(
            { task_group: "/pulp/api/v3/task-groups/prune-group/" },
            { status: 202 },
          );
        }),
        http.get("/pulp/api/v3/task-groups/:id/", () =>
          HttpResponse.json({
            pulp_href: "/pulp/api/v3/task-groups/prune-group/",
            tasks: [{ pulp_href: "/pulp/api/v3/tasks/prune-task/" }],
          }),
        ),
      );

      const result = await pruneRpmPackages({
        repo_hrefs: [RPM_REPO_FIXTURE.pulp_href],
        keep_days: 14,
        dry_run: true,
      });

      expect(requestBody).toEqual({
        repo_hrefs: [RPM_REPO_FIXTURE.pulp_href],
        keep_days: 14,
        dry_run: true,
      });
      expect(result.task).toBe("/pulp/api/v3/tasks/prune-task/");
    },
  );

  it("throws a clear error if the task group has no tasks to track", async () => {
    server.use(
      http.post(BASE, () =>
        HttpResponse.json(
          { task_group: "/pulp/api/v3/task-groups/empty/" },
          { status: 202 },
        ),
      ),
      http.get("/pulp/api/v3/task-groups/:id/", () =>
        HttpResponse.json({ pulp_href: "/pulp/api/v3/task-groups/empty/", tasks: [] }),
      ),
    );

    await expect(
      pruneRpmPackages({
        repo_hrefs: [RPM_REPO_FIXTURE.pulp_href],
        keep_days: 14,
        dry_run: true,
      }),
    ).rejects.toThrow(/no task was found to track/);
  });
});
