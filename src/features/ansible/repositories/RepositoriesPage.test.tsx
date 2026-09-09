import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { ANSIBLE_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoriesPage } from "./RepositoriesPage";

describe("Ansible RepositoriesPage", () => {
  it("renders the seeded repository as a link to its detail page", async () => {
    renderApp(<RepositoriesPage />);

    const link = await screen.findByRole("link", { name: ANSIBLE_REPO_FIXTURE.name });
    expect(link).toHaveAttribute("href", "/ansible/repositories/test-ansible-repo");
    expect(
      screen.getByText(ANSIBLE_REPO_FIXTURE.description as string),
    ).toBeInTheDocument();
  });

  it("shows the repository's content size computed from Pulp", async () => {
    server.use(
      http.get("/pulp/api/v3/repositories/", () =>
        HttpResponse.json({ next: null, results: [ANSIBLE_REPO_FIXTURE] }),
      ),
    );

    renderApp(<RepositoriesPage />);

    const row = await screen.findByRole("row", {
      name: new RegExp(`^${ANSIBLE_REPO_FIXTURE.name}`),
    });
    expect(await within(row).findByText("2.0 KB")).toBeInTheDocument();
  });

  it("shows an empty state when there are no repositories", async () => {
    server.use(
      http.get("/pulp/api/v3/repositories/ansible/ansible/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RepositoriesPage />);

    expect(await screen.findByText("No Ansible repositories yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(
      http.get(
        "/pulp/api/v3/repositories/ansible/ansible/",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    renderApp(<RepositoriesPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("disables Sync for a repository with no default remote", async () => {
    server.use(
      http.get("/pulp/api/v3/repositories/ansible/ansible/", () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [{ ...ANSIBLE_REPO_FIXTURE, remote: null }],
        }),
      ),
    );

    renderApp(<RepositoriesPage />);

    await screen.findByText(ANSIBLE_REPO_FIXTURE.name);
    expect(screen.getByRole("button", { name: "Sync" })).toBeDisabled();
  });

  it("syncs a repository that has a default remote and tracks the task", async () => {
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(ANSIBLE_REPO_FIXTURE.name);
    const syncButton = screen.getByRole("button", { name: "Sync" });
    expect(syncButton).not.toBeDisabled();
    fireEvent.click(syncButton);

    expect(
      await screen.findByText(`Sync repository "${ANSIBLE_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("creates a repository synchronously (201, no task) and navigates to its detail page", async () => {
    renderApp(<RepositoriesPage />, {
      route: "/ansible/repositories",
      path: "/ansible/repositories",
    });

    await screen.findByText(ANSIBLE_REPO_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create repository" })[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "brand-new-ansible-repo" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("deletes a repository after confirmation", async () => {
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(ANSIBLE_REPO_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("No Ansible repositories yet")).toBeInTheDocument(),
    );
  });
});
