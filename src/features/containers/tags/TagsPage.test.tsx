import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { CONTAINER_TAG_FIXTURE } from "../../../test/handlers";
import { TagsPage } from "./TagsPage";

const BASE = "/pulp/api/v3/content/container/tags/";

describe("TagsPage", () => {
  it("renders the seeded tag", async () => {
    renderApp(<TagsPage />);

    expect(await screen.findByText(CONTAINER_TAG_FIXTURE.name)).toBeInTheDocument();
  });

  it("shows an empty state when there are no tags", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<TagsPage />);

    expect(await screen.findByText("No tags yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(http.get(BASE, () => new HttpResponse(null, { status: 502 })));

    renderApp(<TagsPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });
});
