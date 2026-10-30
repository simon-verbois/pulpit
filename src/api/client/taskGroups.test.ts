import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mswServer";
import { getTaskGroupSummary } from "./tasks";

const href = "/pulp/api/v3/task-groups/regression/";
describe("task-group outcomes", () => {
  it("keeps tracking after the first child completes", async () => {
    server.use(
      http.get(href, () =>
        HttpResponse.json({
          pulp_href: href,
          all_tasks_dispatched: true,
          tasks: [
            { pulp_href: "/pulp/api/v3/tasks/first/", state: "completed" },
            { pulp_href: "/pulp/api/v3/tasks/second/", state: "running" },
          ],
        }),
      ),
    );
    expect((await getTaskGroupSummary(href)).state).toBe("running");
  });
  it("waits for dispatch even when no child remains active", async () => {
    server.use(
      http.get(href, () =>
        HttpResponse.json({ pulp_href: href, all_tasks_dispatched: false, tasks: [] }),
      ),
    );
    expect((await getTaskGroupSummary(href)).state).toBe("running");
  });
  it("reports a later child's failure with its real details", async () => {
    const failed = "/pulp/api/v3/tasks/failed-child/";
    server.use(
      http.get(href, () =>
        HttpResponse.json({
          pulp_href: href,
          all_tasks_dispatched: true,
          tasks: [
            { pulp_href: "/pulp/api/v3/tasks/first/", state: "completed" },
            { pulp_href: failed, state: "failed" },
          ],
        }),
      ),
      http.get(failed, () =>
        HttpResponse.json({
          pulp_href: failed,
          state: "failed",
          error: { description: "A later repository failed" },
        }),
      ),
    );
    expect(await getTaskGroupSummary(href)).toMatchObject({
      state: "failed",
      error: { description: "A later repository failed" },
    });
  });
});
