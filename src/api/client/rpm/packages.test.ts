import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { RPM_PACKAGE_FIXTURE } from "../../../test/handlers";
import { listRpmPackages, uploadRpmPackage } from "./packages";

const UPLOAD = "/pulp/api/v3/content/rpm/packages/upload/";

describe("rpm packages adapter", () => {
  it("lists packages", async () => {
    const page = await listRpmPackages({ limit: 10, offset: 0 });
    expect(page.results).toEqual([RPM_PACKAGE_FIXTURE]);
  });

  it("filters by repository_version", async () => {
    const page = await listRpmPackages({
      limit: 10,
      offset: 0,
      repository_version: "/pulp/api/v3/repositories/rpm/rpm/repo-1/versions/1/",
    });
    // The default handler treats any repository_version filter as "not yet synced into this version".
    expect(page.results).toEqual([]);
  });

  it("uploads a file as multipart form data, not JSON", async () => {
    let contentType: string | null = null;
    server.use(
      http.post(UPLOAD, async ({ request }) => {
        contentType = request.headers.get("content-type");
        const body = await request.formData();
        // jsdom/undici don't faithfully round-trip a File's name through
        // FormData across the MSW interception boundary - just assert the
        // field is present under the field name the API expects.
        expect(body.get("file")).toBeTruthy();
        return HttpResponse.json(RPM_PACKAGE_FIXTURE, { status: 201 });
      }),
    );

    const file = new File(["rpm-bytes"], "walrus-5.21-1.noarch.rpm", {
      type: "application/x-rpm",
    });
    const pkg = await uploadRpmPackage(file);

    expect(contentType).toMatch(/^multipart\/form-data/);
    expect(pkg).toEqual(RPM_PACKAGE_FIXTURE);
  });
});
