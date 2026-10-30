import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mswServer";
import {
  findDistributionMatches,
  isUnusedDistribution,
  listRepositoryDistributions,
} from "./distributionManagement";

const repository = "/pulp/api/v3/repositories/file/file/owned/";
const base = "/pulp/api/v3/distributions/file/file/";
const summary = {
  name: "fixture",
  base_path: "file/fixture",
  pulp_href: `${base}fixture/`,
};
describe("distribution targets and recovery", () => {
  it("lists latest, version-pinned and publication-pinned distributions for their real repository", async () => {
    const publication = "/pulp/api/v3/publications/file/file/owned/";
    const items = [
      { ...summary, pulp_href: `${base}latest/`, repository },
      {
        ...summary,
        pulp_href: `${base}version/`,
        repository: null,
        repository_version: `${repository}versions/1/`,
      },
      { ...summary, pulp_href: `${base}publication/`, repository: null, publication },
      {
        ...summary,
        pulp_href: `${base}unrelated/`,
        repository: "/pulp/api/v3/repositories/file/file/other/",
      },
    ];
    server.use(
      http.get(base, () =>
        HttpResponse.json({ count: 4, next: null, previous: null, results: items }),
      ),
      http.get(publication, () =>
        HttpResponse.json({
          pulp_href: publication,
          repository,
          repository_version: `${repository}versions/1/`,
        }),
      ),
    );
    const result = await listRepositoryDistributions("file", repository, 10, 0);
    expect(result.results.map((item) => item.pulp_href)).toEqual(
      items.slice(0, 3).map((item) => item.pulp_href),
    );
    expect(result.count).toBe(3);
  });
  it("never treats a remote-backed or pinned distribution as unused", () => {
    expect(isUnusedDistribution(summary)).toBe(true);
    expect(
      isUnusedDistribution({
        ...summary,
        remote: "/pulp/api/v3/remotes/file/file/remote/",
      }),
    ).toBe(false);
    expect(
      isUnusedDistribution({
        ...summary,
        repository_version: `${repository}versions/1/`,
      }),
    ).toBe(false);
  });
  it("resolves full targets and reports cross-format collisions instead of reconnecting them", async () => {
    const href = "/pulp/api/v3/distributions/ansible/ansible/conflict/";
    server.use(
      http.get("/pulp/api/v3/distributions/", () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [{ ...summary, pulp_href: href }],
        }),
      ),
      http.get(href, () =>
        HttpResponse.json({
          ...summary,
          pulp_href: href,
          repository: null,
          content_guard: "/pulp/api/v3/contentguards/core/header/guard/",
        }),
      ),
    );
    expect(
      await findDistributionMatches("file", "fixture", "file/fixture"),
    ).toMatchObject([
      {
        sameKind: false,
        distribution: { content_guard: "/pulp/api/v3/contentguards/core/header/guard/" },
      },
    ]);
  });
});
