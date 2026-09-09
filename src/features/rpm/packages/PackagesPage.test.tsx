import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { RPM_PACKAGE_FIXTURE } from "../../../test/handlers";
import { PackagesPage } from "./PackagesPage";

describe("PackagesPage", () => {
  it("renders the seeded package with a human-readable size", async () => {
    renderApp(<PackagesPage />);

    expect(await screen.findByText(RPM_PACKAGE_FIXTURE.name)).toBeInTheDocument();
    expect(screen.getByText("5.21-1")).toBeInTheDocument();
    expect(screen.getByText("noarch")).toBeInTheDocument();
    expect(screen.getByText("1.8 KB")).toBeInTheDocument();
  });

  it("shows an empty state when there are no packages", async () => {
    server.use(
      http.get("/pulp/api/v3/content/rpm/packages/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<PackagesPage />);

    expect(await screen.findByText("No RPM packages yet")).toBeInTheDocument();
  });

  it("keeps the search available when no package matches", async () => {
    server.use(
      http.get("/pulp/api/v3/content/rpm/packages/", ({ request }) => {
        const search = new URL(request.url).searchParams.get("name__contains");
        const results = search === "missing" ? [] : [RPM_PACKAGE_FIXTURE];
        return HttpResponse.json({
          count: results.length,
          next: null,
          previous: null,
          results,
        });
      }),
    );

    renderApp(<PackagesPage />);

    const searchInput = await screen.findByRole("textbox", {
      name: "Search packages by name",
    });
    fireEvent.change(searchInput, { target: { value: "missing" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("No matching RPM packages")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Search packages by name" })).toHaveValue(
      "missing",
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(await screen.findByText(RPM_PACKAGE_FIXTURE.name)).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(
      http.get(
        "/pulp/api/v3/content/rpm/packages/",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    renderApp(<PackagesPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });
});
