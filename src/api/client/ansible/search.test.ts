import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { searchCollectionVersions } from "./search";

const BASE =
  "/pulp_ansible/galaxy/default/api/v3/plugin/ansible/search/collection-versions/";

const SEARCH_RESULT_FIXTURE = {
  collection_version: {
    pulp_href: "/pulp/api/v3/content/ansible/collection_versions/cv-1/",
    namespace: "pulpit_test",
    name: "demo",
    version: "1.0.0",
  },
  repository: {
    pulp_href: "/pulp/api/v3/repositories/ansible/ansible/repo-1/",
    name: "test-ansible-repo",
  },
  is_highest: true,
  is_deprecated: false,
  is_signed: false,
};

describe("ansible cross-repository search adapter", () => {
  it(
    "parses the Galaxy-v3 {meta, links, data} envelope - VERIFIED live this " +
      "differs from every other list endpoint in this app (including the " +
      "Galaxy namespace list, which uses the normal Pulp envelope)",
    async () => {
      let requestedUrl = "";
      server.use(
        http.get(BASE, ({ request }) => {
          requestedUrl = request.url;
          return HttpResponse.json({
            meta: { count: 1 },
            links: { first: null, previous: null, next: null, last: null },
            data: [SEARCH_RESULT_FIXTURE],
          });
        }),
      );

      const page = await searchCollectionVersions({ limit: 10, offset: 0, q: "demo" });

      expect(requestedUrl).toContain("q=demo");
      expect(page.meta.count).toBe(1);
      expect(page.data).toEqual([SEARCH_RESULT_FIXTURE]);
    },
  );
});
