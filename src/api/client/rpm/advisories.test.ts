import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { RPM_ADVISORY_FIXTURE, RPM_REPO_FIXTURE } from "../../../test/handlers";
import { listRpmAdvisories, uploadRpmAdvisory } from "./advisories";

const UPLOAD_BASE = "/pulp/api/v3/content/rpm/advisories/";

describe("rpm advisories adapter", () => {
  it("lists advisories", async () => {
    const page = await listRpmAdvisories({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_ADVISORY_FIXTURE]);
  });

  it("uploads an advisory as multipart form data with the repository field set", async () => {
    let contentType: string | null = null;
    let repositoryField: string | null = null;
    server.use(
      http.post(UPLOAD_BASE, async ({ request }) => {
        contentType = request.headers.get("content-type");
        const body = await request.formData();
        repositoryField = body.get("repository") as string;
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/upload-advisory-task/" },
          { status: 202 },
        );
      }),
    );

    // The real endpoint expects JSON content (VERIFIED live - see the
    // uploadRpmAdvisory docstring), but the adapter itself only cares about
    // the multipart envelope and the repository field, not the file's
    // internal format - a plain text stub is enough to test that.
    const file = new File(["{}"], "advisory.json", { type: "application/json" });
    const result = await uploadRpmAdvisory(file, RPM_REPO_FIXTURE.pulp_href);

    expect(contentType).toMatch(/^multipart\/form-data/);
    expect(repositoryField).toBe(RPM_REPO_FIXTURE.pulp_href);
    expect(result.task).toBe("/pulp/api/v3/tasks/upload-advisory-task/");
  });
});
