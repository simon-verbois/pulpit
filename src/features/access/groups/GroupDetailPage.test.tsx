import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import {
  ACCESS_CUSTOM_ROLE_FIXTURE,
  ACCESS_GROUP_FIXTURE,
  ACCESS_USER_FIXTURE,
} from "../../../test/handlers";
import { GroupDetailPage } from "./GroupDetailPage";

function renderDetail(name = ACCESS_GROUP_FIXTURE.name) {
  return renderApp(<GroupDetailPage />, {
    route: `/access/groups/${name}`,
    path: "/access/groups/:name",
  });
}

describe("GroupDetailPage", () => {
  it("shows the members tab by default, empty at first", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Members" });
    expect(
      screen.getByRole("heading", { name: ACCESS_GROUP_FIXTURE.name }),
    ).toBeInTheDocument();
    expect(await screen.findByText("No members yet")).toBeInTheDocument();
  });

  it("shows a not-found state for a group name that doesn't exist", async () => {
    renderDetail("does-not-exist");

    expect(await screen.findByText("Group not found")).toBeInTheDocument();
  });

  it("shows a normalized error state when the lookup fails", async () => {
    server.use(
      http.get("/pulp/api/v3/groups/", () => new HttpResponse(null, { status: 502 })),
    );

    renderDetail();

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("adds a member and then removes them", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Members" });
    fireEvent.click(screen.getAllByRole("button", { name: "Add member…" })[0]);

    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("option", { name: ACCESS_USER_FIXTURE.username });
    fireEvent.change(within(dialog).getByLabelText("User", { exact: false }), {
      target: { value: ACCESS_USER_FIXTURE.username },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText(ACCESS_USER_FIXTURE.username)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.getByText("No members yet")).toBeInTheDocument());
  });

  it("assigns a global role to the group and shows it in the Roles tab", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Members" });
    fireEvent.click(screen.getByRole("tab", { name: "Roles" }));

    expect(await screen.findByText("No roles assigned yet")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Assign role…" })[0]);

    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("option", { name: ACCESS_CUSTOM_ROLE_FIXTURE.name });
    fireEvent.change(within(dialog).getByLabelText("Role", { exact: false }), {
      target: { value: ACCESS_CUSTOM_ROLE_FIXTURE.name },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Assign" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText(ACCESS_CUSTOM_ROLE_FIXTURE.name)).toBeInTheDocument();
  });

  it("deletes the group after confirmation", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Members" });
    fireEvent.click(screen.getByRole("button", { name: "Delete group" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
