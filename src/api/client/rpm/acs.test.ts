import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { RPM_ACS_FIXTURE, RPM_REMOTE_FIXTURE } from "../../../test/handlers";
import {
  createAlternateContentSource,
  deleteAlternateContentSource,
  listAlternateContentSources,
  refreshAlternateContentSource,
  updateAlternateContentSource,
} from "./acs";

const BASE = "/pulp/api/v3/acs/rpm/rpm/";

describe("rpm alternate content sources adapter", () => {
  it("lists alternate content sources", async () => {
    const page = await listAlternateContentSources({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_ACS_FIXTURE]);
  });

  it("creates synchronously (201, no task)", async () => {
    const created = await createAlternateContentSource({
      name: "new-acs",
      remote: RPM_REMOTE_FIXTURE.pulp_href,
    });
    expect(created.name).toBe("new-acs");
  });

  it("updates asynchronously (202 + task)", async () => {
    server.use(
      http.patch(`${BASE}:id/`, () =>
        HttpResponse.json(
          { task: "/pulp/api/v3/tasks/update-acs-task/" },
          { status: 202 },
        ),
      ),
    );
    const result = await updateAlternateContentSource(RPM_ACS_FIXTURE.pulp_href, {
      name: "renamed",
    });
    expect(result.task).toBe("/pulp/api/v3/tasks/update-acs-task/");
  });

  it("deletes asynchronously (202 + task)", async () => {
    const result = await deleteAlternateContentSource(RPM_ACS_FIXTURE.pulp_href);
    expect(result.task).toMatch(/^\/pulp\/api\/v3\/tasks\//);
  });

  it(
    "refreshes with the full task group " +
      "(VERIFIED live: refresh returns {task_group}, not {task}, a distinct shape)",
    async () => {
      const result = await refreshAlternateContentSource(RPM_ACS_FIXTURE.pulp_href);
      expect(result.task).toMatch(/^\/pulp\/api\/v3\/task-groups\//);
    },
  );

  it("keeps a group that has not dispatched any children yet", async () => {
    server.use(
      http.post(`${BASE}:id/refresh/`, () =>
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
      refreshAlternateContentSource(RPM_ACS_FIXTURE.pulp_href),
    ).resolves.toEqual({ task: "/pulp/api/v3/task-groups/empty/" });
  });
});
