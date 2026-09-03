import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import { renderApp } from "../../test/renderApp";
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
    renderApp(
      <ObjectAccessTab
        objectHref={RPM_REPO_FIXTURE.pulp_href}
        objectLabel='"test-repo"'
      />,
    );

    await screen.findByText("No one has explicit access yet");
    fireEvent.click(screen.getAllByRole("button", { name: "Grant access…" })[0]);

    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("option", { name: ACCESS_CUSTOM_ROLE_FIXTURE.name });
    fireEvent.change(within(dialog).getByLabelText("Role", { exact: false }), {
      target: { value: ACCESS_CUSTOM_ROLE_FIXTURE.name },
    });
    fireEvent.change(within(dialog).getByLabelText("Users", { exact: false }), {
      target: { value: "alice, bob" },
    });
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
    fireEvent.click(screen.getAllByRole("button", { name: "Grant access…" })[0]);
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("option", { name: ACCESS_CUSTOM_ROLE_FIXTURE.name });
    fireEvent.change(within(dialog).getByLabelText("Role", { exact: false }), {
      target: { value: ACCESS_CUSTOM_ROLE_FIXTURE.name },
    });
    fireEvent.change(within(dialog).getByLabelText("Users", { exact: false }), {
      target: { value: "alice, bob" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Grant" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await screen.findByText("alice");

    const aliceRow = screen.getByRole("row", { name: /alice/ });
    fireEvent.click(within(aliceRow).getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(screen.queryByText("alice")).not.toBeInTheDocument());
    expect(screen.getByText("bob")).toBeInTheDocument();
  });
});
