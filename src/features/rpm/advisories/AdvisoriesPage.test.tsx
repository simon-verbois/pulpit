import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { RPM_ADVISORY_FIXTURE } from "../../../test/handlers";
import { AdvisoriesPage } from "./AdvisoriesPage";

describe("AdvisoriesPage", () => {
  it("renders the seeded advisory", async () => {
    renderApp(<AdvisoriesPage />);

    expect(await screen.findByText(RPM_ADVISORY_FIXTURE.id)).toBeInTheDocument();
    expect(screen.getByText(RPM_ADVISORY_FIXTURE.title)).toBeInTheDocument();
    expect(screen.getByText(RPM_ADVISORY_FIXTURE.type)).toBeInTheDocument();
  });

  it("shows an empty state when there are no advisories", async () => {
    server.use(
      http.get("/pulp/api/v3/content/rpm/advisories/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<AdvisoriesPage />);

    expect(await screen.findByText("No RPM advisories yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(
      http.get(
        "/pulp/api/v3/content/rpm/advisories/",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    renderApp(<AdvisoriesPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });
});
