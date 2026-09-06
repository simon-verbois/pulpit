import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { FILE_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoriesPage } from "./RepositoriesPage";

describe("RepositoriesPage", () => {
  it("renders the seeded repository as a link to its detail page", async () => {
    renderApp(<RepositoriesPage />);

    const link = await screen.findByRole("link", { name: FILE_REPO_FIXTURE.name });
    expect(link).toHaveAttribute("href", "/files/repositories/test-file-repo");
    expect(screen.getByText(FILE_REPO_FIXTURE.description as string)).toBeInTheDocument();
  });

  it("shows an empty state when there are no repositories", async () => {
    server.use(
      http.get("/pulp/api/v3/repositories/file/file/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RepositoriesPage />);

    expect(await screen.findByText("No File repositories yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(
      http.get(
        "/pulp/api/v3/repositories/file/file/",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    renderApp(<RepositoriesPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("disables Sync for a repository with no default remote", async () => {
    server.use(
      http.get("/pulp/api/v3/repositories/file/file/", () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [{ ...FILE_REPO_FIXTURE, remote: null }],
        }),
      ),
    );

    renderApp(<RepositoriesPage />);

    await screen.findByText(FILE_REPO_FIXTURE.name);
    expect(screen.getByRole("button", { name: "Sync" })).toBeDisabled();
  });

  it("syncs a repository that has a default remote and tracks the task", async () => {
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(FILE_REPO_FIXTURE.name);
    const syncButton = screen.getByRole("button", { name: "Sync" });
    expect(syncButton).not.toBeDisabled();
    fireEvent.click(syncButton);

    expect(
      await screen.findByText(`Sync repository "${FILE_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("publishes a repository from the list and tracks the task", async () => {
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(FILE_REPO_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText(`Publish repository "${FILE_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("creates a repository synchronously (201, no task) and navigates to its detail page", async () => {
    renderApp(<RepositoriesPage />, {
      route: "/files/repositories",
      path: "/files/repositories",
    });

    await screen.findByText(FILE_REPO_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create repository" })[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(dialog.querySelector("#repository-name") as HTMLInputElement, {
      target: { value: "brand-new-repo" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("defaults autopublish on and sends it as part of the create request", async () => {
    let requestBody: unknown;
    server.use(
      http.post("/pulp/api/v3/repositories/file/file/", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          {
            ...FILE_REPO_FIXTURE,
            pulp_href: "/pulp/api/v3/repositories/file/file/new/",
            name: "new-repo",
          },
          { status: 201 },
        );
      }),
    );
    renderApp(<RepositoriesPage />, {
      route: "/files/repositories",
      path: "/files/repositories",
    });

    await screen.findByText(FILE_REPO_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create repository" })[0]);

    const dialog = await screen.findByRole("dialog");
    const autopublishCheckbox = within(dialog).getByLabelText(/Automatically publish/i);
    expect(autopublishCheckbox).toBeChecked();

    fireEvent.change(dialog.querySelector("#repository-name") as HTMLInputElement, {
      target: { value: "new-repo" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requestBody).toMatchObject({ autopublish: true });
  });

  it("deletes a repository after confirmation", async () => {
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(FILE_REPO_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("No File repositories yet")).toBeInTheDocument(),
    );
  });
});
