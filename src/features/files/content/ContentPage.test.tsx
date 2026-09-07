import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { FILE_CONTENT_FIXTURE } from "../../../test/handlers";
import { ContentPage } from "./ContentPage";

describe("ContentPage", () => {
  it("renders the seeded file", async () => {
    renderApp(<ContentPage />);

    expect(
      await screen.findByText(FILE_CONTENT_FIXTURE.relative_path),
    ).toBeInTheDocument();
    expect(screen.getByText(FILE_CONTENT_FIXTURE.sha256 as string)).toBeInTheDocument();
  });

  it("shows an empty state when there is no file content", async () => {
    server.use(
      http.get("/pulp/api/v3/content/file/files/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<ContentPage />);

    expect(await screen.findByText("No file content yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(
      http.get(
        "/pulp/api/v3/content/file/files/",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    renderApp(<ContentPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });
});
