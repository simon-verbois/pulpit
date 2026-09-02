import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { ACCESS_CUSTOM_ROLE_FIXTURE, ACCESS_USER_FIXTURE } from "../../../test/handlers";
import { UserDetailPage } from "./UserDetailPage";

function renderDetail(username = ACCESS_USER_FIXTURE.username) {
  return renderApp(<UserDetailPage />, {
    route: `/access/users/${username}`,
    path: "/access/users/:username",
  });
}

describe("UserDetailPage", () => {
  it("shows the overview tab by default with the user's details", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    expect(
      screen.getByRole("heading", { name: ACCESS_USER_FIXTURE.username }),
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("edits the user's profile synchronously (no task)", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("First name", { exact: false }), {
      target: { value: "Ada" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Ada")).toBeInTheDocument();
  });

  it("renaming the user navigates to its new URL", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Username", { exact: false }), {
      target: { value: "renamed-user" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByRole("heading", { name: "renamed-user" }),
    ).toBeInTheDocument();
  });

  it("shows a not-found state for a username that doesn't exist", async () => {
    renderDetail("does-not-exist");

    expect(await screen.findByText("User not found")).toBeInTheDocument();
  });

  it("shows a normalized error state when the lookup fails", async () => {
    server.use(
      http.get("/pulp/api/v3/users/", () => new HttpResponse(null, { status: 502 })),
    );

    renderDetail();

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("assigns a global role and shows it in the Roles tab", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
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
    expect(screen.getByText("Global")).toBeInTheDocument();
  });

  it("removes an assigned role", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Roles" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Assign role…" })[0]);

    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("option", { name: ACCESS_CUSTOM_ROLE_FIXTURE.name });
    fireEvent.change(within(dialog).getByLabelText("Role", { exact: false }), {
      target: { value: ACCESS_CUSTOM_ROLE_FIXTURE.name },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Assign" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await screen.findByText(ACCESS_CUSTOM_ROLE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(screen.getByText("No roles assigned yet")).toBeInTheDocument(),
    );
  });

  it("deletes the user after confirmation and navigates back to the list", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("button", { name: "Delete user" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
