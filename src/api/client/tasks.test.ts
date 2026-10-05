import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../test/mswServer";
import {
  TASK_HISTORY_FIXTURE_COMPLETED,
  TASK_HISTORY_FIXTURE_FAILED,
} from "../../test/handlers";
import { cancelTask, listTasks } from "./tasks";

const BASE = "/pulp/api/v3/tasks/";

describe("tasks adapter", () => {
  it("lists tasks with pagination and defaults to newest-first ordering", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 2,
          next: null,
          previous: null,
          results: [TASK_HISTORY_FIXTURE_COMPLETED, TASK_HISTORY_FIXTURE_FAILED],
        });
      }),
    );

    const page = await listTasks({ limit: 20, offset: 0 });

    expect(requestedUrl).toContain("limit=20");
    expect(requestedUrl).toContain("ordering=-pulp_created");
    expect(page.results).toEqual([
      TASK_HISTORY_FIXTURE_COMPLETED,
      TASK_HISTORY_FIXTURE_FAILED,
    ]);
  });

  it("filters by state and name__contains", async () => {
    const page = await listTasks({ limit: 20, offset: 0, state: "failed" });
    expect(page.results).toEqual([TASK_HISTORY_FIXTURE_FAILED]);
  });

  it("requests cancellation on the task href and returns the updated task", async () => {
    let requestBody: unknown;
    server.use(
      http.patch(`${BASE}:id/`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({
          ...TASK_HISTORY_FIXTURE_COMPLETED,
          pulp_href: `${BASE}running-1/`,
          state: "canceling",
        });
      }),
    );

    const task = await cancelTask(`${BASE}running-1/`);

    expect(requestBody).toEqual({ state: "canceled" });
    expect(task.state).toBe("canceling");
  });
});
