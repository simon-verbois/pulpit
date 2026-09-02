import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { ANSIBLE_REPO_FIXTURE, COLLECTION_VERSION_FIXTURE } from "../../../test/handlers";
import { CollectionVersionsPage } from "./CollectionVersionsPage";

const COLLECTION_VERSIONS_BASE = "/pulp/api/v3/content/ansible/collection_versions/";
const DEPRECATIONS_BASE = "/pulp/api/v3/content/ansible/collection_deprecations/";

describe("CollectionVersionsPage", () => {
  it("renders the seeded collection version", async () => {
    renderApp(<CollectionVersionsPage />);

    expect(await screen.findByText(COLLECTION_VERSION_FIXTURE.name)).toBeInTheDocument();
  });

  it("shows an empty state when there are no collection versions", async () => {
    server.use(
      http.get(COLLECTION_VERSIONS_BASE, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<CollectionVersionsPage />);

    expect(await screen.findByText("No collections yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(
      http.get(COLLECTION_VERSIONS_BASE, () => new HttpResponse(null, { status: 502 })),
    );

    renderApp(<CollectionVersionsPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("shows existing deprecations as labels above the toolbar", async () => {
    server.use(
      http.get(DEPRECATIONS_BASE, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: `${DEPRECATIONS_BASE}dep-1/`,
              namespace: "pulpit_test",
              name: "demo",
            },
          ],
        }),
      ),
    );

    renderApp(<CollectionVersionsPage />);

    expect(await screen.findByText("pulpit_test.demo")).toBeInTheDocument();
  });

  it("deprecates a collection and tracks the task", async () => {
    renderApp(<CollectionVersionsPage />, { withTasksDrawer: true });

    await screen.findByText(COLLECTION_VERSION_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Deprecate collection…" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Namespace", { exact: false }), {
      target: { value: "pulpit_test" },
    });
    // "Name" is a substring of "Namespace" and PatternFly appends a
    // required-marker to the label text, so match the start of the label
    // instead of doing an exact or plain substring match.
    fireEvent.change(within(dialog).getByLabelText(/^Name\b/), {
      target: { value: "demo" },
    });
    fireEvent.change(within(dialog).getByLabelText("Repository", { exact: false }), {
      target: { value: ANSIBLE_REPO_FIXTURE.pulp_href },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Deprecate" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText('Deprecate "pulpit_test.demo"')).toBeInTheDocument();
  });
});
