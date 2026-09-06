import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { RPM_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoriesPage } from "./RepositoriesPage";

describe("RepositoriesPage", () => {
  it("renders the seeded repository as a link to its detail page", async () => {
    renderApp(<RepositoriesPage />);

    const link = await screen.findByRole("link", { name: RPM_REPO_FIXTURE.name });
    expect(link).toHaveAttribute("href", "/rpm/repositories/test-repo");
    expect(screen.getByText(RPM_REPO_FIXTURE.description as string)).toBeInTheDocument();
  });

  it("shows the repository's cached content size, dash when none is cached yet", async () => {
    server.use(
      http.get("/pulpit-core/api/v1/content_size/repository-sizes", () =>
        HttpResponse.json([
          {
            repository_href: RPM_REPO_FIXTURE.pulp_href,
            size_bytes: 200381,
            updated_at: "2026-01-01T00:00:00Z",
          },
        ]),
      ),
    );

    renderApp(<RepositoriesPage />);

    const row = await screen.findByRole("row", {
      name: new RegExp(`^${RPM_REPO_FIXTURE.name}`),
    });
    expect(await within(row).findByText("195.7 KB")).toBeInTheDocument();
  });

  it("shows an empty state when there are no repositories", async () => {
    server.use(
      http.get("/pulp/api/v3/repositories/rpm/rpm/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RepositoriesPage />);

    expect(await screen.findByText("No RPM repositories yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(
      http.get(
        "/pulp/api/v3/repositories/rpm/rpm/",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    renderApp(<RepositoriesPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("disables Sync for a repository with no default remote", async () => {
    server.use(
      http.get("/pulp/api/v3/repositories/rpm/rpm/", () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [{ ...RPM_REPO_FIXTURE, remote: null }],
        }),
      ),
    );

    renderApp(<RepositoriesPage />);

    await screen.findByText(RPM_REPO_FIXTURE.name);
    expect(screen.getByRole("button", { name: "Sync" })).toBeDisabled();
  });

  it("syncs a repository that has a default remote and tracks the task", async () => {
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(RPM_REPO_FIXTURE.name);
    const syncButton = screen.getByRole("button", { name: "Sync" });
    expect(syncButton).not.toBeDisabled();
    fireEvent.click(syncButton);

    expect(
      await screen.findByText(`Sync repository "${RPM_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("prunes packages (dry run by default) and tracks the resolved task", async () => {
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(RPM_REPO_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Prune packages…" }));

    const dialog = await screen.findByRole("dialog");
    const repoCheckbox = await within(dialog).findByLabelText(RPM_REPO_FIXTURE.name);
    fireEvent.click(repoCheckbox);
    fireEvent.click(within(dialog).getByRole("button", { name: "Run dry run" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Prune packages (dry run)")).toBeInTheDocument();
  });

  it("publishes a repository from the list and tracks the task", async () => {
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(RPM_REPO_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText(`Publish repository "${RPM_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("creates a repository synchronously (201, no task) and navigates to its detail page", async () => {
    renderApp(<RepositoriesPage />, {
      route: "/rpm/repositories",
      path: "/rpm/repositories",
    });

    await screen.findByText(RPM_REPO_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create repository" })[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "brand-new-repo" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("defaults autopublish on and sends it as part of the create request", async () => {
    let requestBody: unknown;
    server.use(
      http.post("/pulp/api/v3/repositories/rpm/rpm/", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          {
            ...RPM_REPO_FIXTURE,
            pulp_href: "/pulp/api/v3/repositories/rpm/rpm/new/",
            name: "new-repo",
          },
          { status: 201 },
        );
      }),
    );
    renderApp(<RepositoriesPage />, {
      route: "/rpm/repositories",
      path: "/rpm/repositories",
    });

    await screen.findByText(RPM_REPO_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create repository" })[0]);

    const dialog = await screen.findByRole("dialog");
    const autopublishCheckbox = within(dialog).getByLabelText(/Automatically publish/i);
    expect(autopublishCheckbox).toBeChecked();

    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "new-repo" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requestBody).toMatchObject({ autopublish: true });
  });

  it("sends no signing fields when the global signing policy has nothing enabled (default fixture)", async () => {
    let requestBody: unknown;
    server.use(
      http.post("/pulp/api/v3/repositories/rpm/rpm/", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { ...RPM_REPO_FIXTURE, pulp_href: "/pulp/api/v3/repositories/rpm/rpm/new/" },
          { status: 201 },
        );
      }),
    );

    renderApp(<RepositoriesPage />, {
      route: "/rpm/repositories",
      path: "/rpm/repositories",
    });

    await screen.findByText(RPM_REPO_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create repository" })[0]);

    const dialog = await screen.findByRole("dialog");
    // No per-repository signing choice is exposed at all - signing is
    // fully automatic based on the global policy, not an opt-in checkbox.
    expect(within(dialog).queryByText("Sign packages")).not.toBeInTheDocument();
    expect(
      within(dialog).queryByText("Sign repository metadata"),
    ).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "new-repo" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requestBody).not.toHaveProperty("package_signing_service");
    expect(requestBody).not.toHaveProperty("package_signing_fingerprint");
    expect(requestBody).not.toHaveProperty("metadata_signing_service");
  });

  it("automatically applies the active signing key when the policy allows it, with no user choice involved", async () => {
    server.use(
      http.get("/pulpit-core/api/v1/signing/repositories/policy", () =>
        HttpResponse.json({
          package_signing_enabled: true,
          metadata_signing_enabled: true,
          package_signing_service: "/pulp/api/v3/signing-services/pkg/",
          package_signing_fingerprint: "ABCD1234EF567890ABCD1234EF567890ABCD1234",
          metadata_signing_service: "/pulp/api/v3/signing-services/meta/",
        }),
      ),
    );
    let requestBody: unknown;
    server.use(
      http.post("/pulp/api/v3/repositories/rpm/rpm/", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          {
            ...RPM_REPO_FIXTURE,
            pulp_href: "/pulp/api/v3/repositories/rpm/rpm/new/",
            name: "signed-repo",
          },
          { status: 201 },
        );
      }),
    );

    renderApp(<RepositoriesPage />, {
      route: "/rpm/repositories",
      path: "/rpm/repositories",
    });

    await screen.findByText(RPM_REPO_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create repository" })[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "signed-repo" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requestBody).toMatchObject({
      package_signing_service: "/pulp/api/v3/signing-services/pkg/",
      package_signing_fingerprint: "ABCD1234EF567890ABCD1234EF567890ABCD1234",
      metadata_signing_service: "/pulp/api/v3/signing-services/meta/",
    });
  });

  it("deletes a repository after confirmation", async () => {
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(RPM_REPO_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("No RPM repositories yet")).toBeInTheDocument(),
    );
  });
});
