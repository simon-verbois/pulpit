import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { ACCESS_GROUP_FIXTURE } from "../../../test/handlers";
import { GroupsPage } from "./GroupsPage";

const BASE = "/pulp/api/v3/groups/";

describe("GroupsPage", () => {
  it("renders the seeded group as a link to its detail page", async () => {
    renderApp(<GroupsPage />);

    const link = await screen.findByRole("link", { name: ACCESS_GROUP_FIXTURE.name });
    expect(link).toHaveAttribute("href", "/access/groups/test-group");
  });

  it("shows an empty state when there are no groups", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<GroupsPage />);

    expect(await screen.findByText("No groups yet")).toBeInTheDocument();
  });

  it("creates a group synchronously (201, no task) and navigates to its detail page", async () => {
    renderApp(<GroupsPage />, { route: "/access/groups", path: "/access/groups" });

    await screen.findByText(ACCESS_GROUP_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Create group" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "brand-new-group" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("deletes a group after confirmation", async () => {
    renderApp(<GroupsPage />);

    await screen.findByText(ACCESS_GROUP_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("No groups yet")).toBeInTheDocument());
  });
});
