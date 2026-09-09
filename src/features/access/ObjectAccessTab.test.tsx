import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { renderApp } from "../../test/renderApp";
import { server } from "../../test/mswServer";
import { ACCESS_CUSTOM_ROLE_FIXTURE, RPM_REPO_FIXTURE } from "../../test/handlers";
import { ObjectAccessTab } from "./ObjectAccessTab";

describe("ObjectAccessTab", () => {
  it("shows an empty state when no one has explicit access yet", async () => {
    renderApp(
      <ObjectAccessTab
        objectHref={RPM_REPO_FIXTURE.pulp_href}
        objectLabel='"test-repo"'
      />,
    );

    expect(await screen.findByText("No one has explicit access yet")).toBeInTheDocument();
  });

  it("grants access to a user and lists it as a (role, subject) row", async () => {
    server.use(
      http.get("/pulp/api/v3/users/", () =>
        HttpResponse.json({
          count: 2,
          next: null,
          previous: null,
          results: [
            { pulp_href: "/pulp/api/v3/users/11/", username: "alice" },
            { pulp_href: "/pulp/api/v3/users/12/", username: "bob" },
          ],
        }),
      ),
    );
    renderApp(
      <ObjectAccessTab
        objectHref={RPM_REPO_FIXTURE.pulp_href}
        objectLabel='"test-repo"'
      />,
    );

    await screen.findByText("No one has explicit access yet");
    fireEvent.click(screen.getByRole("button", { name: "Grant access…" }));

    const dialog = await screen.findByRole("dialog");
    const roleInput = within(dialog).getByLabelText("Role", { exact: true });
    fireEvent.change(roleInput, { target: { value: ACCESS_CUSTOM_ROLE_FIXTURE.name } });
    await screen.findByRole("option", { name: ACCESS_CUSTOM_ROLE_FIXTURE.name });
    fireEvent.keyDown(roleInput, { key: "ArrowDown" });
    fireEvent.keyDown(roleInput, { key: "Enter" });
    const usersInput = within(dialog).getByLabelText("Users", { exact: true });
    fireEvent.click(usersInput);
    fireEvent.click(await screen.findByRole("option", { name: "alice" }));
    fireEvent.change(usersInput, { target: { value: "bob" } });
    fireEvent.keyDown(usersInput, { key: "ArrowDown" });
    fireEvent.keyDown(usersInput, { key: "Enter" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Grant" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getAllByText(ACCESS_CUSTOM_ROLE_FIXTURE.name)).toHaveLength(2);
  });

  it("revokes access for one subject without disabling the whole row", async () => {
    renderApp(
      <ObjectAccessTab
        objectHref={RPM_REPO_FIXTURE.pulp_href}
        objectLabel='"test-repo"'
      />,
    );

    await screen.findByText("No one has explicit access yet");
    fireEvent.click(screen.getByRole("button", { name: "Grant access…" }));
    const dialog = await screen.findByRole("dialog");
    const roleInput = within(dialog).getByLabelText("Role", { exact: true });
    fireEvent.change(roleInput, { target: { value: ACCESS_CUSTOM_ROLE_FIXTURE.name } });
    await screen.findByRole("option", { name: ACCESS_CUSTOM_ROLE_FIXTURE.name });
    fireEvent.keyDown(roleInput, { key: "ArrowDown" });
    fireEvent.keyDown(roleInput, { key: "Enter" });
    const usersInput = within(dialog).getByLabelText("Users", { exact: true });
    fireEvent.change(usersInput, { target: { value: "test-user" } });
    fireEvent.keyDown(usersInput, { key: "ArrowDown" });
    fireEvent.keyDown(usersInput, { key: "Enter" });
    const groupsInput = within(dialog).getByLabelText("Groups", { exact: true });
    fireEvent.change(groupsInput, { target: { value: "test-group" } });
    fireEvent.keyDown(groupsInput, { key: "ArrowDown" });
    fireEvent.keyDown(groupsInput, { key: "Enter" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Grant" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await screen.findByText("test-user");

    const userRow = screen.getByRole("row", { name: /test-user/ });
    fireEvent.click(within(userRow).getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(screen.queryByText("test-user")).not.toBeInTheDocument());
    expect(screen.getByText("test-group")).toBeInTheDocument();
  });
});
