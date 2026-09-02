import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { RPM_ACS_FIXTURE, RPM_REMOTE_FIXTURE } from "../../../test/handlers";
import { AlternateSourcesPage } from "./AlternateSourcesPage";

describe("AlternateSourcesPage", () => {
  it("renders the seeded alternate content source", async () => {
    renderApp(<AlternateSourcesPage />);

    expect(await screen.findByText(RPM_ACS_FIXTURE.name)).toBeInTheDocument();
    expect(screen.getByText("Never")).toBeInTheDocument(); // last_refreshed: null
  });

  it("shows an empty state when there are none", async () => {
    server.use(
      http.get("/pulp/api/v3/acs/rpm/rpm/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<AlternateSourcesPage />);

    expect(
      await screen.findByText("No alternate content sources yet"),
    ).toBeInTheDocument();
  });

  it("only lists on-demand remotes in the create form", async () => {
    renderApp(<AlternateSourcesPage />);

    await screen.findByText(RPM_ACS_FIXTURE.name);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Create alternate source" })[0],
    );

    const dialog = await screen.findByRole("dialog");
    // The seeded remote's policy is "immediate", not "on_demand" - VERIFIED
    // live that an ACS rejects any other policy, so it must not be offered.
    const remoteSelect = await within(dialog).findByLabelText("Remote", { exact: false });
    expect(
      within(remoteSelect).queryByText(RPM_REMOTE_FIXTURE.name),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(/Only remotes with the "On demand"/),
    ).toBeInTheDocument();
  });

  it("refreshes an alternate content source and tracks the resolved task", async () => {
    renderApp(<AlternateSourcesPage />, { withTasksDrawer: true });

    await screen.findByText(RPM_ACS_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(
      await screen.findByText(
        `Refresh alternate content source "${RPM_ACS_FIXTURE.name}"`,
      ),
    ).toBeInTheDocument();
  });

  it("deletes an alternate content source after confirmation", async () => {
    renderApp(<AlternateSourcesPage />, { withTasksDrawer: true });

    await screen.findByText(RPM_ACS_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("No alternate content sources yet")).toBeInTheDocument(),
    );
  });
});
