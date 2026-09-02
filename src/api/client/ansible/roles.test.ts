import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { listAnsibleRoles, uploadAnsibleRole } from "./roles";

const ARTIFACTS_BASE = "/pulp/api/v3/artifacts/";
const ROLES_BASE = "/pulp/api/v3/content/ansible/roles/";

const ROLE_FIXTURE = {
  pulp_href: `${ROLES_BASE}role-1/`,
  name: "testrole",
  namespace: "pulpit_test",
  version: "1.0.0",
  pulp_created: "2026-08-30T10:00:00.000000Z",
};

describe("ansible roles adapter", () => {
  it("lists roles filtered by repository_version", async () => {
    let requestedUrl = "";
    server.use(
      http.get(ROLES_BASE, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [ROLE_FIXTURE],
        });
      }),
    );

    const page = await listAnsibleRoles({
      limit: 10,
      offset: 0,
      repository_version: "/pulp/api/v3/repositories/ansible/ansible/repo-1/versions/1/",
    });
    expect(requestedUrl).toContain("repository_version=");
    expect(page.results).toEqual([ROLE_FIXTURE]);
  });

  it(
    "uploads a role as a real two-step flow (VERIFIED live schema: " +
      "ansible.Role only accepts a pre-existing artifact href, no direct file field) - " +
      "synchronous (201, no task) unlike collection version upload, checking by sha256 first",
    async () => {
      let roleRequestBody: Record<string, unknown> = {};
      server.use(
        http.get(ARTIFACTS_BASE, () =>
          HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
        ),
        http.post(ARTIFACTS_BASE, () =>
          HttpResponse.json(
            { pulp_href: `${ARTIFACTS_BASE}artifact-1/` },
            { status: 201 },
          ),
        ),
        http.post(ROLES_BASE, async ({ request }) => {
          roleRequestBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(ROLE_FIXTURE, { status: 201 });
        }),
      );

      const file = new File(["fake role tarball"], "testrole.tar.gz");
      const role = await uploadAnsibleRole(
        file,
        { name: "testrole", namespace: "pulpit_test", version: "1.0.0" },
        "/pulp/api/v3/repositories/ansible/ansible/repo-1/",
      );

      expect(roleRequestBody).toEqual({
        artifact: `${ARTIFACTS_BASE}artifact-1/`,
        name: "testrole",
        namespace: "pulpit_test",
        version: "1.0.0",
        repository: "/pulp/api/v3/repositories/ansible/ansible/repo-1/",
      });
      expect(role.name).toBe("testrole");
    },
  );

  it(
    "reuses an existing artifact by sha256 instead of re-uploading it - VERIFIED live: " +
      "pulpcore's generic artifacts endpoint 400s on a duplicate-content POST rather " +
      "than transparently deduping it, hit for real re-uploading the same role tarball",
    async () => {
      let artifactPosted = false;
      server.use(
        http.get(ARTIFACTS_BASE, () =>
          HttpResponse.json({
            count: 1,
            next: null,
            previous: null,
            results: [{ pulp_href: `${ARTIFACTS_BASE}existing-artifact/` }],
          }),
        ),
        http.post(ARTIFACTS_BASE, () => {
          artifactPosted = true;
          return HttpResponse.json(
            { non_field_errors: ["already exists"] },
            { status: 400 },
          );
        }),
        http.post(ROLES_BASE, () => HttpResponse.json(ROLE_FIXTURE, { status: 201 })),
      );

      await uploadAnsibleRole(
        new File(["fake role tarball"], "testrole.tar.gz"),
        { name: "testrole", namespace: "pulpit_test", version: "1.0.0" },
        "/pulp/api/v3/repositories/ansible/ansible/repo-1/",
      );

      expect(artifactPosted).toBe(false);
    },
  );
});
