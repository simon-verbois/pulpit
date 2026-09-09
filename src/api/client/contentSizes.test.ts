import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mswServer";
import { getComponentContentSizes, getRepositoryContentSizes } from "./contentSizes";

describe("content sizes under the caller's Pulp permissions", () => {
  it("paginates using the configured API and does not follow a foreign next URL", async () => {
    const offsets: string[] = [];
    server.use(
      http.get("/pulp/api/v3/content/", ({ request }) => {
        const offset = new URL(request.url).searchParams.get("offset")!;
        offsets.push(offset);
        return HttpResponse.json({
          next: offset === "0" ? "https://foreign.invalid/steal" : null,
          results: [
            {
              pulp_href: `/pulp/api/v3/content/rpm/packages/${offset}/`,
              artifacts: { file: "/pulp/api/v3/artifacts/rpm/" },
            },
          ],
        });
      }),
    );
    const result = await getComponentContentSizes();
    expect(offsets).toEqual(["0", "1000"]);
    expect(result[0].size_bytes).toBe(400762);
  });

  it("only calculates sizes for repositories returned to the caller", async () => {
    const versions: string[] = [];
    server.use(
      http.get("/pulp/api/v3/repositories/", () =>
        HttpResponse.json({
          next: null,
          results: [
            { pulp_href: "/visible/", latest_version_href: "/visible/versions/1/" },
          ],
        }),
      ),
      http.get("/pulp/api/v3/content/", ({ request }) => {
        versions.push(new URL(request.url).searchParams.get("repository_version")!);
        return HttpResponse.json({ next: null, results: [] });
      }),
    );
    const sizes = await getRepositoryContentSizes();
    expect(versions).toEqual(["/visible/versions/1/"]);
    expect(sizes.map((size) => size.repository_href)).toEqual(["/visible/"]);
    expect(sizes[0].size_bytes).toBe(0);
  });

  it("propagates permission failures instead of using privileged cached data", async () => {
    server.use(
      http.get("/pulp/api/v3/artifacts/", () =>
        HttpResponse.json({ detail: "Forbidden" }, { status: 403 }),
      ),
    );
    await expect(getComponentContentSizes()).rejects.toMatchObject({ status: 403 });
  });
});
