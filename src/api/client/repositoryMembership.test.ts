import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "../../test/mswServer";
import { listRepositoriesContainingContent } from "./repositoryMembership";

describe("repository membership adapter", () => {
  it("uses current-content semantics and follows repository pagination", async () => {
    const requests: URL[] = [];
    server.use(
      http.get("/pulp/api/v3/repositories/rpm/rpm/", ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const offset = Number(url.searchParams.get("offset"));
        return HttpResponse.json({
          count: 101,
          next: offset === 0 ? "next" : null,
          previous: null,
          results: Array.from({ length: offset === 0 ? 100 : 1 }, (_, index) => ({
            pulp_href: `/pulp/api/v3/repositories/rpm/rpm/${offset + index}/`,
            name: `repo-${offset + index}`,
          })),
        });
      }),
    );

    const contentHref = "/pulp/api/v3/content/rpm/packages/package-1/";
    const repositories = await listRepositoriesContainingContent("rpm", contentHref);

    expect(repositories).toHaveLength(101);
    expect(requests).toHaveLength(2);
    expect(requests[0].searchParams.get("latest_with_content")).toBe(contentHref);
    expect(requests[0].searchParams.get("fields")).toBe("pulp_href,name");
    expect(requests[0].searchParams.get("ordering")).toBe("name");
    expect(requests[1].searchParams.get("offset")).toBe("100");
  });
});
