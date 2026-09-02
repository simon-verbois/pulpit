import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { listCollectionVersions, uploadCollectionVersion } from "./collectionVersions";

const BASE = "/pulp/api/v3/content/ansible/collection_versions/";

const CV_FIXTURE = {
  pulp_href: `${BASE}cv-1/`,
  namespace: "pulpit_test",
  name: "demo",
  version: "1.0.0",
  authors: [],
  description: null,
  documentation: null,
  homepage: null,
  issues: null,
  license: [],
  tags: [],
  requires_ansible: ">=2.9",
  sha256: null,
  pulp_created: "2026-08-30T10:00:00.000000Z",
};

describe("ansible collection versions adapter", () => {
  it("lists collection versions filtered by repository_version", async () => {
    let requestedUrl = "";
    server.use(
      http.get(BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [CV_FIXTURE],
        });
      }),
    );

    const page = await listCollectionVersions({
      limit: 10,
      offset: 0,
      repository_version: "/pulp/api/v3/repositories/ansible/ansible/repo-1/versions/1/",
    });
    expect(requestedUrl).toContain("repository_version=");
    expect(page.results).toEqual([CV_FIXTURE]);
  });

  it(
    "uploads a collection with file+repository directly (one step) but " +
      "asynchronously (202 + task), unlike RPM package upload",
    async () => {
      let sawRepositoryField = false;
      server.use(
        http.post(BASE, async ({ request }) => {
          const formData = await request.formData();
          sawRepositoryField =
            formData.get("repository") ===
            "/pulp/api/v3/repositories/ansible/ansible/repo-1/";
          return HttpResponse.json(
            { task: "/pulp/api/v3/tasks/upload-task/" },
            { status: 202 },
          );
        }),
      );

      const file = new File(["fake tarball"], "demo-1.0.0.tar.gz");
      const result = await uploadCollectionVersion(
        file,
        "/pulp/api/v3/repositories/ansible/ansible/repo-1/",
      );

      expect(sawRepositoryField).toBe(true);
      expect(result.task).toBe("/pulp/api/v3/tasks/upload-task/");
    },
  );
});
