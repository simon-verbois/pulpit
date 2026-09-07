import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import {
  ACCESS_CUSTOM_ROLE_FIXTURE,
  ACCESS_LOCKED_ROLE_FIXTURE,
} from "../../../test/handlers";
import { RolesPage } from "./RolesPage";

const BASE = "/pulp/api/v3/roles/";

describe("RolesPage", () => {
  it("defaults to the All filter, showing both custom and built-in roles", async () => {
    renderApp(<RolesPage />, { withAdministrationHeaderAction: "roles" });

    expect(await screen.findByText(ACCESS_CUSTOM_ROLE_FIXTURE.name)).toBeInTheDocument();
    expect(screen.getByText(ACCESS_LOCKED_ROLE_FIXTURE.name)).toBeInTheDocument();
  });

  it("switches to Custom to show only the unlocked role", async () => {
    renderApp(<RolesPage />, { withAdministrationHeaderAction: "roles" });

    await screen.findByText(ACCESS_CUSTOM_ROLE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));

    await waitFor(() =>
      expect(screen.queryByText(ACCESS_LOCKED_ROLE_FIXTURE.name)).not.toBeInTheDocument(),
    );
    expect(screen.getByText(ACCESS_CUSTOM_ROLE_FIXTURE.name)).toBeInTheDocument();
  });

  it("switches to Built-in to show locked roles without Edit/Delete actions", async () => {
    renderApp(<RolesPage />, { withAdministrationHeaderAction: "roles" });

    await screen.findByText(ACCESS_CUSTOM_ROLE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Built-in" }));

    expect(await screen.findByText(ACCESS_LOCKED_ROLE_FIXTURE.name)).toBeInTheDocument();
    const row = screen.getByRole("row", {
      name: new RegExp(ACCESS_LOCKED_ROLE_FIXTURE.name),
    });
    expect(within(row).getByText("Built-in")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no custom roles, keeping the filter toolbar", async () => {
    // Only the "Custom" filter (locked=false) is empty here - "All" and
    // "Built-in" still have roles, so the toolbar (with the filter toggle)
    // must stay visible rather than being replaced by a full-page empty
    // state, otherwise the user couldn't switch back to see them.
    server.use(
      http.get(BASE, ({ request }) => {
        const locked = new URL(request.url).searchParams.get("locked");
        if (locked === "false") {
          return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
        }
        return HttpResponse.json({
          count: 2,
          next: null,
          previous: null,
          results: [ACCESS_CUSTOM_ROLE_FIXTURE, ACCESS_LOCKED_ROLE_FIXTURE],
        });
      }),
    );

    renderApp(<RolesPage />, { withAdministrationHeaderAction: "roles" });

    await screen.findByText(ACCESS_CUSTOM_ROLE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));

    expect(await screen.findByText("No custom roles yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
  });

  it("shows a generic empty state for the default All filter", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RolesPage />, { withAdministrationHeaderAction: "roles" });

    expect(await screen.findByText("No roles found")).toBeInTheDocument();
  });

  it("creates a custom role with permissions picked from the picker", async () => {
    renderApp(<RolesPage />, { withAdministrationHeaderAction: "roles" });

    await screen.findByText(ACCESS_CUSTOM_ROLE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Create role" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "my_org.new_role" },
    });
    const submitButton = within(dialog).getByRole("button", { name: "Create" });
    expect(submitButton).toBeDisabled();

    await within(dialog).findByLabelText("rpm.view_rpmrepository");
    fireEvent.click(within(dialog).getByLabelText("rpm.view_rpmrepository"));
    expect(submitButton).not.toBeDisabled();
    fireEvent.click(submitButton);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("edits a custom role", async () => {
    renderApp(<RolesPage />, { withAdministrationHeaderAction: "roles" });

    await screen.findByText(ACCESS_CUSTOM_ROLE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Description", { exact: false }), {
      target: { value: "Updated description" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Updated description")).toBeInTheDocument();
  });

  it("deletes a custom role after confirmation", async () => {
    renderApp(<RolesPage />, { withAdministrationHeaderAction: "roles" });

    await screen.findByText(ACCESS_CUSTOM_ROLE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    await screen.findByText(ACCESS_CUSTOM_ROLE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("No custom roles yet")).toBeInTheDocument(),
    );
  });
});
