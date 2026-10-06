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

  it("shows the repository's backend-cached content size", async () => {
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
    const taskHref = "/pulp/api/v3/tasks/busy-sync/";
    server.use(
      http.post(`${RPM_REPO_FIXTURE.pulp_href}sync/`, () =>
        HttpResponse.json({ task: taskHref }, { status: 202 }),
      ),
      http.get(taskHref, () =>
        HttpResponse.json({
          pulp_href: taskHref,
          name: "Sync repository",
          state: "running",
          finished_at: null,
        }),
      ),
    );
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(RPM_REPO_FIXTURE.name);
    const syncButton = screen.getByRole("button", { name: "Sync" });
    expect(syncButton).not.toBeDisabled();
    fireEvent.click(syncButton);

    expect(
      await screen.findByText(`Sync repository "${RPM_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
    expect(syncButton).toBeDisabled();
    expect(syncButton).toHaveAttribute("aria-busy", "true");
    fireEvent.click(screen.getByRole("button", { name: /^Actions for / }));
    expect(await screen.findByRole("menuitem", { name: /^Publish/ })).toBeDisabled();
  });

  it("opens a tracked task on the Tasks page when its drawer item is clicked", async () => {
    renderApp(<RepositoriesPage />, { withTasksDrawer: true });

    await screen.findByText(RPM_REPO_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Sync" }));
    fireEvent.click(
      await screen.findByText(`Sync repository "${RPM_REPO_FIXTURE.name}"`),
    );

    expect((await screen.findByTestId("route-probe")).textContent).toMatch(
      /^\/tasks\?task=[^/]+$/,
    );
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
    fireEvent.click(screen.getByRole("button", { name: /^Actions for / }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /^Publish/ }));

    expect(
      await screen.findByText(`Publish repository "${RPM_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("edits a repository from its row menu and stays on the list after a rename", async () => {
    renderApp(<RepositoriesPage />, {
      route: "/rpm/repositories",
      path: "/rpm/repositories",
      withTasksDrawer: true,
    });

    await screen.findByText(RPM_REPO_FIXTURE.name);
    fireEvent.click(
      screen.getByRole("button", { name: `Actions for ${RPM_REPO_FIXTURE.name}` }),
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "renamed-from-list" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("renamed-from-list")).toBeInTheDocument();
    // No route matches the detail URL here - had the modal navigated, the list would be gone.
    expect(screen.getByRole("heading", { name: "RPM repositories" })).toBeInTheDocument();
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

  it("offers ULN remotes as well as standard remotes as the default remote", async () => {
    server.use(
      http.get("/pulp/api/v3/remotes/rpm/uln/", () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: "/pulp/api/v3/remotes/rpm/uln/uln-1/",
              name: "ol9-baseos",
              url: "uln://ol9_x86_64_baseos_latest",
              uln_server_base_url: "https://linux-update.oracle.com/",
              policy: "immediate",
              pulp_created: "2026-08-20T11:00:00.000000Z",
              proxy_url: null,
              tls_validation: true,
              hidden_fields: [],
            },
          ],
        }),
      ),
    );
    renderApp(<RepositoriesPage />, {
      route: "/rpm/repositories",
      path: "/rpm/repositories",
    });

    await screen.findByText(RPM_REPO_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create repository" })[0]);

    const dialog = await screen.findByRole("dialog");
    const select = dialog.querySelector("#repository-remote") as HTMLSelectElement;
    expect(await within(dialog).findByRole("option", { name: "ol9-baseos" })).toHaveValue(
      "/pulp/api/v3/remotes/rpm/uln/uln-1/",
    );
    expect(
      within(select).getByRole("group", { name: "ULN remotes" }),
    ).toBeInTheDocument();
    expect(
      within(select).getByRole("group", { name: "Standard remotes" }),
    ).toBeInTheDocument();
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

  it("defaults to creating a distribution named after the new repository", async () => {
    let distributionRequestBody: unknown;
    server.use(
      http.post("/pulp/api/v3/repositories/rpm/rpm/", async ({ request }) => {
        const body = (await request.json()) as { name: string };
        return HttpResponse.json(
          {
            ...RPM_REPO_FIXTURE,
            pulp_href: "/pulp/api/v3/repositories/rpm/rpm/new-repo/",
            name: body.name,
          },
          { status: 201 },
        );
      }),
      http.post("/pulp/api/v3/distributions/rpm/rpm/", async ({ request }) => {
        distributionRequestBody = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/create-dist-task/" },
          { status: 202 },
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
    const createDistCheckbox = within(dialog).getByLabelText(
      /Create a distribution for this repository/i,
    );
    expect(createDistCheckbox).toBeChecked();

    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "epel-9" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(distributionRequestBody).toMatchObject({
        name: "epel-9",
        base_path: "rpm/epel-9",
        repository: "/pulp/api/v3/repositories/rpm/rpm/new-repo/",
        generate_repo_config: true,
      }),
    );
  });

  it("computes repo_config from the signing policy", async () => {
    let repositoryRequestBody: unknown;
    server.use(
      http.get("/pulpit-core/api/v1/signing/repositories/policy", () =>
        HttpResponse.json({
          package_signing_enabled: true,
          metadata_signing_enabled: false,
          package_signing_service: "/pulp/api/v3/signing-services/pkg/",
          package_signing_fingerprint: "ABCD1234EF567890ABCD1234EF567890ABCD1234",
          metadata_signing_service: null,
        }),
      ),
      http.post("/pulp/api/v3/repositories/rpm/rpm/", async ({ request }) => {
        repositoryRequestBody = await request.json();
        return HttpResponse.json(
          {
            ...RPM_REPO_FIXTURE,
            pulp_href: "/pulp/api/v3/repositories/rpm/rpm/new-repo/",
            name: "epel-9",
          },
          { status: 201 },
        );
      }),
      http.post("/pulp/api/v3/distributions/rpm/rpm/", () =>
        HttpResponse.json(
          { task: "/pulp/api/v3/tasks/create-dist-task/" },
          { status: 202 },
        ),
      ),
    );

    renderApp(<RepositoriesPage />, {
      route: "/rpm/repositories",
      path: "/rpm/repositories",
    });

    await screen.findByText(RPM_REPO_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create repository" })[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "epel-9" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(repositoryRequestBody).toMatchObject({
        repo_config: { gpgcheck: 1, repo_gpgcheck: 0, sslverify: 0 },
      }),
    );
  });

  it("skips creating a distribution when unchecked", async () => {
    let distributionCreateCalled = false;
    server.use(
      http.post("/pulp/api/v3/repositories/rpm/rpm/", async ({ request }) => {
        const body = (await request.json()) as { name: string };
        return HttpResponse.json(
          {
            ...RPM_REPO_FIXTURE,
            pulp_href: "/pulp/api/v3/repositories/rpm/rpm/new-repo/",
            name: body.name,
          },
          { status: 201 },
        );
      }),
      http.post("/pulp/api/v3/distributions/rpm/rpm/", () => {
        distributionCreateCalled = true;
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/create-dist-task/" },
          { status: 202 },
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
    fireEvent.click(
      within(dialog).getByLabelText(/Create a distribution for this repository/i),
    );
    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "no-dist-repo" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(distributionCreateCalled).toBe(false);
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
    fireEvent.click(screen.getByRole("button", { name: /^Actions for / }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /^Delete/ }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("No RPM repositories yet")).toBeInTheDocument(),
    );
  });
});
