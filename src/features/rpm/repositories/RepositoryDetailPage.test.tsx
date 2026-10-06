import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import {
  RPM_ADVISORY_FIXTURE,
  RPM_DISTRIBUTION_FIXTURE,
  RPM_REMOTE_FIXTURE,
  RPM_REPO_FIXTURE,
} from "../../../test/handlers";
import {
  clickRepositoryAction,
  openRepositoryActions,
  repositoryActionName,
} from "../../../test/repositoryActions";
import { RepositoryDetailPage } from "./RepositoryDetailPage";

function renderDetail(name = RPM_REPO_FIXTURE.name) {
  return renderApp(<RepositoryDetailPage />, {
    route: `/rpm/repositories/${name}`,
    path: "/rpm/repositories/:name",
    withTasksDrawer: true,
  });
}

describe("RepositoryDetailPage", () => {
  it("shows the overview tab by default with the repository's details", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    expect(
      screen.getByRole("heading", { name: RPM_REPO_FIXTURE.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(RPM_REPO_FIXTURE.description as string)).toBeInTheDocument();
    // Default remote: its actual name, linked to the filtered Remotes page.
    const remoteLink = await screen.findByRole("link", { name: RPM_REMOTE_FIXTURE.name });
    expect(remoteLink).toHaveAttribute(
      "href",
      `/rpm/remotes?search=${encodeURIComponent(RPM_REMOTE_FIXTURE.name)}`,
    );
    // Signing is off globally in the default fixture - nothing to re-sign with.
    await openRepositoryActions();
    expect(
      screen.queryByRole("menuitem", { name: repositoryActionName("Re-sign now") }),
    ).not.toBeInTheDocument();
  });

  it("summarizes the latest version and links it to the Versions tab", async () => {
    server.use(
      http.get(RPM_REPO_FIXTURE.latest_version_href, () =>
        HttpResponse.json({
          pulp_href: RPM_REPO_FIXTURE.latest_version_href,
          number: 1,
          repository: RPM_REPO_FIXTURE.pulp_href,
          pulp_created: "2026-01-02T10:00:00Z",
          content_summary: {
            added: {},
            removed: {},
            present: {
              "rpm.package": { count: 35, href: "" },
              "rpm.advisory": { count: 1, href: "" },
            },
          },
        }),
      ),
    );
    renderDetail();

    expect(await screen.findByText("35 packages, 1 advisory")).toBeInTheDocument();
    // Sync now is the page's one primary action, in the header.
    expect(screen.getByRole("button", { name: "Sync now" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Version 1" }));
    expect(screen.getByRole("tab", { name: "Versions" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("re-signs the repository and reports the result", async () => {
    let resignBody: unknown;
    server.use(
      http.get("/pulpit-core/api/v1/signing/repositories/policy", () =>
        HttpResponse.json({
          package_signing_enabled: true,
          metadata_signing_enabled: true,
          package_signing_service: "/pulp/api/v3/signing-services/pkg/",
          package_signing_fingerprint: "A".repeat(40),
          metadata_signing_service: "/pulp/api/v3/signing-services/meta/",
        }),
      ),
      http.post(
        "/pulpit-core/api/v1/signing/repositories/resign",
        async ({ request }) => {
          resignBody = await request.json();
          return HttpResponse.json({ id: "job-1", status: "queued" }, { status: 202 });
        },
      ),
      http.get("/pulpit-core/api/v1/jobs/job-1", () =>
        HttpResponse.json({
          id: "job-1",
          job_type: "signing.resign_repository_packages",
          status: "success",
          result: {
            evaluated: 12,
            candidates: 3,
            signed: 2,
            cache_hits: 1,
            failed: 0,
            skipped: 0,
          },
          error: null,
        }),
      ),
    );
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    await clickRepositoryAction("Re-sign now");
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Re-sign" }));

    expect(
      await within(dialog).findByText("Checked 12 packages: 2 re-signed, 1 reused"),
    ).toBeInTheDocument();
    expect(resignBody).toEqual({ repository_href: RPM_REPO_FIXTURE.pulp_href });
    // Also tracked in the Tasks drawer, like a sync or publish.
    expect(
      await screen.findByText(`Re-sign repository "${RPM_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("publishes the repository and tracks the task", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    await clickRepositoryAction("Publish now");

    expect(
      await screen.findByText(`Publish repository "${RPM_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("edits the repository's settings and tracks the task", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    await clickRepositoryAction("Edit");

    const dialog = await screen.findByRole("dialog");
    const descriptionField = within(dialog).getByLabelText("Description", {
      exact: false,
    });
    fireEvent.change(descriptionField, { target: { value: "An updated description" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(`Update repository "${RPM_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("An updated description")).toBeInTheDocument(),
    );
  });

  it("renaming the repository navigates to its new URL", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    await clickRepositoryAction("Edit");

    const dialog = await screen.findByRole("dialog");
    const nameField = within(dialog).getByLabelText("Name", { exact: false });
    fireEvent.change(nameField, { target: { value: "renamed-repo" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByRole("heading", { name: "renamed-repo" }),
    ).toBeInTheDocument();
  });

  it("shows a not-found state for a repository name that doesn't exist", async () => {
    renderDetail("does-not-exist");

    expect(await screen.findByText("Repository not found")).toBeInTheDocument();
  });

  it("shows a normalized error state when the lookup fails", async () => {
    server.use(
      http.get(
        "/pulp/api/v3/repositories/rpm/rpm/",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    renderDetail();

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("switches to the Versions tab and shows synced content", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Versions" }));

    const panel = await screen.findByRole("tabpanel");
    expect(await within(panel).findByText(/Version 1/)).toBeInTheDocument();
    expect(within(panel).getByText("Current")).toBeInTheDocument();
    expect(within(panel).getByText("35 packages")).toBeInTheDocument();
    expect(within(panel).getByText(/Version 0/)).toBeInTheDocument();
  });

  it("switches to the Packages tab and offers an upload action", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Packages" }));

    expect(
      await screen.findByText("No packages in this repository yet"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload package" })).toBeInTheDocument();
  });

  it("switches to the Advisories tab and shows this repository's advisories", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Advisories" }));

    expect(await screen.findByText(RPM_ADVISORY_FIXTURE.id)).toBeInTheDocument();
  });

  it("switches to the Content tab and shows sync-derived content counts", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Content" }));

    expect(
      await screen.findByRole("button", { name: /Package groups \(1\)/ }),
    ).toBeInTheDocument();
  });

  it("switches to the Distributions tab and shows this repository's distributions", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Distributions" }));

    expect(await screen.findByText(RPM_DISTRIBUTION_FIXTURE.name)).toBeInTheDocument();
  });

  it("switches to the Access tab - shared with Ansible/Container repository pages", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Access" }));

    expect(await screen.findByText("No one has explicit access yet")).toBeInTheDocument();
  });

  it("deletes the repository after confirmation and navigates back to the list", async () => {
    renderApp(<RepositoryDetailPage />, {
      route: `/rpm/repositories/${RPM_REPO_FIXTURE.name}`,
      path: "/rpm/repositories/:name",
    });

    await screen.findByRole("tab", { name: "Overview" });
    await clickRepositoryAction("Delete repository");

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
