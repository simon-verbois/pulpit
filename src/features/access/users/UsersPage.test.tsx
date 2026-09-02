import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { ACCESS_USER_FIXTURE } from "../../../test/handlers";
import { UsersPage } from "./UsersPage";

const BASE = "/pulp/api/v3/users/";

describe("UsersPage", () => {
  it("renders the seeded user as a link to its detail page", async () => {
    renderApp(<UsersPage />);

    const link = await screen.findByRole("link", { name: ACCESS_USER_FIXTURE.username });
    expect(link).toHaveAttribute("href", "/access/users/test-user");
  });

  it("shows an empty state when there are no users", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<UsersPage />);

    expect(await screen.findByText("No users yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(http.get(BASE, () => new HttpResponse(null, { status: 502 })));

    renderApp(<UsersPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("creates a user synchronously (201, no task) and navigates to its detail page", async () => {
    renderApp(<UsersPage />, { route: "/access/users", path: "/access/users" });

    await screen.findByText(ACCESS_USER_FIXTURE.username);
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Username", { exact: false }), {
      target: { value: "brand-new-user" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("deletes a user after confirmation", async () => {
    renderApp(<UsersPage />);

    await screen.findByText(ACCESS_USER_FIXTURE.username);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("No users yet")).toBeInTheDocument());
  });
});
