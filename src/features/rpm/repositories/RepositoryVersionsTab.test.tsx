import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { RPM_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoryVersionsTab } from "./RepositoryVersionsTab";

const OTHER_REPO = {
  ...RPM_REPO_FIXTURE,
  pulp_href: "/pulp/api/v3/repositories/rpm/rpm/other-repo/",
  name: "other-repo",
};

describe("RepositoryVersionsTab", () => {
  it("copies the current version's content to another repository and tracks the task", async () => {
    server.use(
      http.get("/pulp/api/v3/repositories/rpm/rpm/", () =>
        HttpResponse.json({
          count: 2,
          next: null,
          previous: null,
          results: [RPM_REPO_FIXTURE, OTHER_REPO],
        }),
      ),
    );

    renderApp(<RepositoryVersionsTab repository={RPM_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findByText(/Version 1/);
    fireEvent.click(screen.getByRole("button", { name: "Copy to…" }));

    const dialog = await screen.findByRole("dialog");
    const destSelect = await within(dialog).findByLabelText("Destination repository", {
      exact: false,
    });
    // The source repository itself must not be offered as a destination.
    expect(within(destSelect).queryByText(RPM_REPO_FIXTURE.name)).not.toBeInTheDocument();
    fireEvent.change(destSelect, { target: { value: OTHER_REPO.pulp_href } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(`Copy content to "${OTHER_REPO.name}"`),
    ).toBeInTheDocument();
  });
});
