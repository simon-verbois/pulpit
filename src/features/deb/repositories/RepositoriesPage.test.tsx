import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { DEB_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoriesPage } from "./RepositoriesPage";

describe("RepositoriesPage", () => {
  it("renders the seeded repository as a link to its detail page", async () => {
    renderApp(<RepositoriesPage />);

    const link = await screen.findByRole("link", { name: DEB_REPO_FIXTURE.name });
    expect(link).toHaveAttribute("href", "/deb/repositories/test-deb-repo");
    expect(screen.getByText(DEB_REPO_FIXTURE.description as string)).toBeInTheDocument();
  });

  it("shows an empty state when there are no repositories", async () => {
    server.use(
      http.get("/pulp/api/v3/repositories/deb/apt/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RepositoriesPage />);

    expect(await screen.findByText("No Debian repositories yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(
      http.get(
        "/pulp/api/v3/repositories/deb/apt/",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    renderApp(<RepositoriesPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("syncs a repository that has a default remote and tracks the task", async () => {
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(DEB_REPO_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Sync" }));

    expect(
      await screen.findByText(`Sync repository "${DEB_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("publishes a repository from the list and tracks the task", async () => {
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(DEB_REPO_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: /^Actions for / }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /^Publish/ }));

    expect(
      await screen.findByText(`Publish repository "${DEB_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("creates a repository synchronously (201, no task) and navigates to its detail page", async () => {
    renderApp(<RepositoriesPage />, {
      route: "/deb/repositories",
      path: "/deb/repositories",
    });

    await screen.findByText(DEB_REPO_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create repository" })[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(dialog.querySelector("#repository-name") as HTMLInputElement, {
      target: { value: "brand-new-repo" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("deletes a repository after confirmation", async () => {
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(DEB_REPO_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: /^Actions for / }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /^Delete/ }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("No Debian repositories yet")).toBeInTheDocument(),
    );
  });
});
