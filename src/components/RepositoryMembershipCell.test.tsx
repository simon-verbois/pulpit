import { fireEvent, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "../test/mswServer";
import { renderApp } from "../test/renderApp";
import { RepositoryMembershipCell } from "./RepositoryMembershipCell";

const ENDPOINT = "/pulp/api/v3/repositories/deb/apt/";
const CONTENT_HREF = "/pulp/api/v3/content/deb/packages/package-1/";

describe("RepositoryMembershipCell", () => {
  it("links every current repository containing the content", async () => {
    server.use(
      http.get(ENDPOINT, () =>
        HttpResponse.json({
          count: 2,
          next: null,
          previous: null,
          results: [
            { pulp_href: `${ENDPOINT}one/`, name: "Debian stable" },
            { pulp_href: `${ENDPOINT}two/`, name: "Debian updates" },
          ],
        }),
      ),
    );
    renderApp(
      <RepositoryMembershipCell contentHref={CONTENT_HREF} repositoryKind="deb" />,
    );

    expect(await screen.findByRole("link", { name: "Debian stable" })).toHaveAttribute(
      "href",
      "/deb/repositories/Debian%20stable",
    );
    expect(screen.getByRole("link", { name: "Debian updates" })).toBeInTheDocument();
  });

  it("surfaces a membership failure and retries it", async () => {
    let requestCount = 0;
    server.use(
      http.get(ENDPOINT, () => {
        requestCount += 1;
        if (requestCount === 1) {
          return HttpResponse.json({ detail: "Permission denied" }, { status: 403 });
        }
        return HttpResponse.json({
          count: 0,
          next: null,
          previous: null,
          results: [],
        });
      }),
    );
    renderApp(
      <RepositoryMembershipCell contentHref={CONTENT_HREF} repositoryKind="deb" />,
    );

    const retry = await screen.findByRole("button", { name: "Unavailable — retry" });
    expect(retry).toHaveAttribute("title", expect.stringContaining("permission"));
    fireEvent.click(retry);
    expect(await screen.findByText("—")).toBeInTheDocument();
    expect(requestCount).toBe(2);
  });
});
