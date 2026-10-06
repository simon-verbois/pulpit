import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { GEM_DISTRIBUTION_FIXTURE, GEM_REPO_FIXTURE } from "../../../test/handlers";
import { clickRepositoryAction } from "../../../test/repositoryActions";
import { RepositoryDetailPage } from "./RepositoryDetailPage";

function renderDetail(name = GEM_REPO_FIXTURE.name) {
  return renderApp(<RepositoryDetailPage />, {
    route: `/gems/repositories/${name}`,
    path: "/gems/repositories/:name",
    withTasksDrawer: true,
  });
}

describe("RepositoryDetailPage", () => {
  it("shows the overview tab by default with the repository's details", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    expect(
      screen.getByRole("heading", { name: GEM_REPO_FIXTURE.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(GEM_REPO_FIXTURE.description as string)).toBeInTheDocument();
    expect(screen.getByText("Configured")).toBeInTheDocument(); // default remote
  });

  it("publishes the repository and tracks the task", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    await clickRepositoryAction("Publish now");

    expect(
      await screen.findByText(`Publish repository "${GEM_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("edits the repository's settings and tracks the task", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    await clickRepositoryAction("Edit");

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Description", { exact: false }), {
      target: { value: "An updated description" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(`Update repository "${GEM_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("shows a not-found state for a repository name that doesn't exist", async () => {
    renderDetail("does-not-exist");

    expect(await screen.findByText("Repository not found")).toBeInTheDocument();
  });

  it("shows a normalized error state when the lookup fails", async () => {
    server.use(
      http.get(
        "/pulp/api/v3/repositories/gem/gem/",
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
    expect(within(panel).getByText(/Version 0/)).toBeInTheDocument();
  });

  it("switches to the Content tab and offers an upload action", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Content" }));

    expect(await screen.findByText("No gems in this repository yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload gem" })).toBeInTheDocument();
  });

  it("switches to the Distributions tab and shows this repository's distributions", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Distributions" }));

    expect(await screen.findByText(GEM_DISTRIBUTION_FIXTURE.name)).toBeInTheDocument();
  });

  it("switches to the Access tab - shared with every other plugin's repository page", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Access" }));

    expect(await screen.findByText("No one has explicit access yet")).toBeInTheDocument();
  });

  it("deletes the repository after confirmation and navigates back to the list", async () => {
    renderApp(<RepositoryDetailPage />, {
      route: `/gems/repositories/${GEM_REPO_FIXTURE.name}`,
      path: "/gems/repositories/:name",
    });

    await screen.findByRole("tab", { name: "Overview" });
    await clickRepositoryAction("Delete repository");

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
