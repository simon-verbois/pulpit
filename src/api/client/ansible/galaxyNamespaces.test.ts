import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import {
  createGalaxyNamespace,
  deleteGalaxyNamespace,
  listGalaxyNamespaces,
  updateGalaxyNamespace,
} from "./galaxyNamespaces";

const BASE =
  "/pulp_ansible/galaxy/default/api/v3/plugin/ansible/content/test-dist/namespaces/";

// VERIFIED live: a namespace's own `pulp_href` (as returned by list/get)
// points at the *read-only* content-type resource and 405s on PATCH - only
// used here to prove the adapter does NOT use it for mutation.
const NAMESPACE_FIXTURE = {
  pulp_href: "/pulp/api/v3/content/ansible/namespaces/ns-1/",
  name: "pulpit_test",
  company: "Pulpit",
  email: "",
  description: "",
  resources: "",
  links: [],
  avatar_url: null,
};

describe("ansible galaxy namespaces adapter", () => {
  it("lists namespaces using a normal Pulp pagination envelope (not the search endpoint's shape)", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [NAMESPACE_FIXTURE],
        }),
      ),
    );
    const page = await listGalaxyNamespaces("test-dist", { limit: 10, offset: 0 });
    expect(page.results).toEqual([NAMESPACE_FIXTURE]);
  });

  it("creates a namespace asynchronously (VERIFIED live: 202 + task)", async () => {
    let requestBody: FormData | undefined;
    server.use(
      http.post(BASE, async ({ request }) => {
        requestBody = await request.formData();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/create-task/" },
          { status: 202 },
        );
      }),
    );

    const result = await createGalaxyNamespace("test-dist", {
      name: "pulpit_test",
      company: "Pulpit",
      avatar: new File(["fake"], "avatar.png"),
    });

    expect(result.task).toBe("/pulp/api/v3/tasks/create-task/");
    expect(requestBody?.get("name")).toBe("pulpit_test");
  });

  it(
    "updates by distribution + name, not the fixture's own pulp_href " +
      "(that href 405s on PATCH against the real API)",
    async () => {
      let requestedUrl = "";
      server.use(
        http.patch(`${BASE}pulpit_test/`, ({ request }) => {
          requestedUrl = request.url;
          return HttpResponse.json(
            { task: "/pulp/api/v3/tasks/update-task/" },
            { status: 202 },
          );
        }),
      );

      const result = await updateGalaxyNamespace("test-dist", "pulpit_test", {
        company: "New Co",
      });

      expect(requestedUrl).toContain(`${BASE}pulpit_test/`);
      expect(result.task).toBe("/pulp/api/v3/tasks/update-task/");
    },
  );

  it("deletes by distribution + name, asynchronously (202 + task)", async () => {
    server.use(
      http.delete(`${BASE}pulpit_test/`, () =>
        HttpResponse.json({ task: "/pulp/api/v3/tasks/delete-task/" }, { status: 202 }),
      ),
    );
    const result = await deleteGalaxyNamespace("test-dist", "pulpit_test");
    expect(result.task).toBe("/pulp/api/v3/tasks/delete-task/");
  });
});
