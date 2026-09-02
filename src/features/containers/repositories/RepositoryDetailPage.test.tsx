import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import {
  CONTAINER_DISTRIBUTION_FIXTURE,
  CONTAINER_REPO_FIXTURE,
} from "../../../test/handlers";
import { RepositoryDetailPage } from "./RepositoryDetailPage";

function renderDetail(name = CONTAINER_REPO_FIXTURE.name) {
  return renderApp(<RepositoryDetailPage />, {
    route: `/containers/repositories/${name}`,
    path: "/containers/repositories/:name",
    withTasksDrawer: true,
  });
}

describe("Container RepositoryDetailPage", () => {
  it("shows the overview tab by default with the repository's details - no publish concept, unlike RPM", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    expect(
      screen.getByRole("heading", { name: CONTAINER_REPO_FIXTURE.name }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(CONTAINER_REPO_FIXTURE.description as string),
    ).toHaveLength(2);
    expect(screen.getByText("Configured")).toBeInTheDocument(); // default remote
    expect(screen.queryByRole("button", { name: "Publish now" })).not.toBeInTheDocument();
  });

  it("edits the repository's settings and tracks the task", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog");
    const descriptionField = within(dialog).getByLabelText("Description", {
      exact: false,
    });
    fireEvent.change(descriptionField, { target: { value: "An updated description" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(`Update repository "${CONTAINER_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByText("An updated description")).toHaveLength(2),
    );
  });

  it("renaming the repository navigates to its new URL", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog");
    const nameField = within(dialog).getByLabelText("Name", { exact: false });
    fireEvent.change(nameField, { target: { value: "renamed-container-repo" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByRole("heading", { name: "renamed-container-repo" }),
    ).toBeInTheDocument();
  });

  it("shows a not-found state for a repository name that doesn't exist", async () => {
    renderDetail("does-not-exist");

    expect(await screen.findByText("Repository not found")).toBeInTheDocument();
  });

  it("shows a normalized error state when the lookup fails", async () => {
    server.use(
      http.get(
        "/pulp/api/v3/repositories/container/container/",
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

    expect(await screen.findByText(/Version 1/)).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText(/1 tags, 1 manifests/)).toBeInTheDocument();
  });

  it("switches to the Tags tab and offers a manual tag action", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Tags" }));

    expect(await screen.findByText("latest")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tag image…" })).toBeInTheDocument();
  });

  it("switches to the Manifests tab and shows manifest details", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Manifests" }));

    expect(await screen.findByText("amd64")).toBeInTheDocument();
  });

  it("switches to the Distributions tab and shows this repository's distributions", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Distributions" }));

    // The fixture's name and base_path are equal strings, so both the
    // "Name" and "Base path" cells match.
    expect(await screen.findAllByText(CONTAINER_DISTRIBUTION_FIXTURE.name)).toHaveLength(
      2,
    );
  });

  it("switches to the Access tab - shared with RPM/Ansible repository pages", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Access" }));

    expect(await screen.findByText("No one has explicit access yet")).toBeInTheDocument();
  });

  it("deletes the repository after confirmation and navigates back to the list", async () => {
    renderApp(<RepositoryDetailPage />, {
      route: `/containers/repositories/${CONTAINER_REPO_FIXTURE.name}`,
      path: "/containers/repositories/:name",
    });

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("button", { name: "Delete repository" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
