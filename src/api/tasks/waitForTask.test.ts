import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../test/mswServer";
import { waitForTask } from "./waitForTask";

describe("waitForTask", () => {
  it("returns a completed task with its created resources", async () => {
    server.use(
      http.get("/pulp/api/v3/tasks/publish-version/", () =>
        HttpResponse.json({
          pulp_href: "/pulp/api/v3/tasks/publish-version/",
          state: "completed",
          created_resources: ["/pulp/api/v3/publications/rpm/rpm/publication-1/"],
        }),
      ),
    );

    const task = await waitForTask("/pulp/api/v3/tasks/publish-version/");

    expect(task.created_resources).toEqual([
      "/pulp/api/v3/publications/rpm/rpm/publication-1/",
    ]);
  });

  it("surfaces Pulp's task error when publication fails", async () => {
    server.use(
      http.get("/pulp/api/v3/tasks/failed-publication/", () =>
        HttpResponse.json({
          pulp_href: "/pulp/api/v3/tasks/failed-publication/",
          state: "failed",
          error: { description: "Repository version is no longer available." },
        }),
      ),
    );

    await expect(waitForTask("/pulp/api/v3/tasks/failed-publication/")).rejects.toThrow(
      "Repository version is no longer available.",
    );
  });
});
