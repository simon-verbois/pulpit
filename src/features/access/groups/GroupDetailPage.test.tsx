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
    const secondUser = {
      ...ACCESS_USER_FIXTURE,
      pulp_href: "/pulp/api/v3/users/2/",
      id: 2,
      username: "second-user",
    };
    server.use(
      http.get("/pulp/api/v3/users/", () =>
        HttpResponse.json({
          count: 2,
          next: null,
          previous: null,
          results: [ACCESS_USER_FIXTURE, secondUser],
        }),
      ),
    );
    renderDetail();

    await screen.findByRole("tab", { name: "Members" });
    fireEvent.click(await screen.findByRole("button", { name: "Add member…" }));

    const dialog = await screen.findByRole("dialog");
    const usersInput = within(dialog).getByLabelText("Users", { exact: true });
    fireEvent.change(usersInput, {
      target: { value: ACCESS_USER_FIXTURE.username },
    });
    fireEvent.click(
      await screen.findByRole("option", {
        name: ACCESS_USER_FIXTURE.username,
        hidden: true,
      }),
    );
    fireEvent.change(usersInput, { target: { value: secondUser.username } });
    fireEvent.click(
      await screen.findByRole("option", {
        name: secondUser.username,
        hidden: true,
      }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText(ACCESS_USER_FIXTURE.username)).toBeInTheDocument();
    expect(screen.getByText(secondUser.username)).toBeInTheDocument();

    fireEvent.click(
      within(
        screen.getByRole("row", { name: new RegExp(ACCESS_USER_FIXTURE.username) }),
      ).getByRole("button", { name: "Remove" }),
    );
    fireEvent.click(
      within(
        screen.getByRole("row", { name: new RegExp(secondUser.username) }),
      ).getByRole("button", { name: "Remove" }),
    );
    await waitFor(() => expect(screen.getByText("No members yet")).toBeInTheDocument());
  });

  it("assigns a global role to the group and shows it in the Roles tab", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Members" });
    fireEvent.click(screen.getByRole("tab", { name: "Roles" }));

    expect(await screen.findByText("No roles assigned yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Assign role…" }));

    const dialog = await screen.findByRole("dialog");
    const roleInput = within(dialog).getByLabelText("Role", { exact: true });
    fireEvent.change(roleInput, { target: { value: ACCESS_CUSTOM_ROLE_FIXTURE.name } });
    await screen.findByRole("option", { name: ACCESS_CUSTOM_ROLE_FIXTURE.name });
    fireEvent.keyDown(roleInput, { key: "ArrowDown" });
    fireEvent.keyDown(roleInput, { key: "Enter" });
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
