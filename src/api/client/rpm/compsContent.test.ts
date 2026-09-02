import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import {
  RPM_PACKAGE_CATEGORY_FIXTURE,
  RPM_PACKAGE_ENVIRONMENT_FIXTURE,
  RPM_PACKAGE_GROUP_FIXTURE,
  RPM_PACKAGE_LANGPACKS_FIXTURE,
  RPM_REPO_FIXTURE,
} from "../../../test/handlers";
import {
  listRpmPackageCategories,
  listRpmPackageEnvironments,
  listRpmPackageGroups,
  listRpmPackageLangpacks,
  uploadComps,
} from "./compsContent";

describe("rpm comps content adapter", () => {
  it("lists package groups", async () => {
    const page = await listRpmPackageGroups({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_PACKAGE_GROUP_FIXTURE]);
  });

  it("lists package categories", async () => {
    const page = await listRpmPackageCategories({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_PACKAGE_CATEGORY_FIXTURE]);
  });

  it("lists package environments", async () => {
    const page = await listRpmPackageEnvironments({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_PACKAGE_ENVIRONMENT_FIXTURE]);
  });

  it("lists package langpacks", async () => {
    const page = await listRpmPackageLangpacks({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_PACKAGE_LANGPACKS_FIXTURE]);
  });

  it("uploads comps.xml as multipart form data with the repository field set", async () => {
    let contentType: string | null = null;
    let repositoryField: string | null = null;
    server.use(
      http.post("/pulp/api/v3/rpm/comps/", async ({ request }) => {
        contentType = request.headers.get("content-type");
        const body = await request.formData();
        repositoryField = body.get("repository") as string;
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/comps-task/" },
          { status: 202 },
        );
      }),
    );

    const file = new File(["<comps/>"], "comps.xml", { type: "text/xml" });
    const result = await uploadComps(file, RPM_REPO_FIXTURE.pulp_href);

    expect(contentType).toMatch(/^multipart\/form-data/);
    expect(repositoryField).toBe(RPM_REPO_FIXTURE.pulp_href);
    expect(result.task).toBe("/pulp/api/v3/tasks/comps-task/");
  });
});
