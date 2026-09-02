import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
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
