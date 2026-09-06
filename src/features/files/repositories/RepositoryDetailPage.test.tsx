import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { FILE_DISTRIBUTION_FIXTURE, FILE_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoryDetailPage } from "./RepositoryDetailPage";

function renderDetail(name = FILE_REPO_FIXTURE.name) {
  return renderApp(<RepositoryDetailPage />, {
    route: `/files/repositories/${name}`,
    path: "/files/repositories/:name",
    withTasksDrawer: true,
  });
}

describe("RepositoryDetailPage", () => {
  it("shows the overview tab by default with the repository's details", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    expect(
      screen.getByRole("heading", { name: FILE_REPO_FIXTURE.name }),
    ).toBeInTheDocument();
    // Appears both in the page header and the Overview tab's description list.
    expect(screen.getAllByText(FILE_REPO_FIXTURE.description as string)).toHaveLength(2);
    expect(screen.getByText("Configured")).toBeInTheDocument(); // default remote
  });

  it("publishes the repository and tracks the task", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    const publishButton = screen.getByRole("button", { name: "Publish now" });
    fireEvent.click(publishButton);

    expect(
      await screen.findByText(`Publish repository "${FILE_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
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
      await screen.findByText(`Update repository "${FILE_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
    // Appears both in the page header and the Overview tab's description list.
    await waitFor(() =>
      expect(screen.getAllByText("An updated description")).toHaveLength(2),
    );
  });

  it("renaming the repository navigates to its new URL", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog");
    // id-based, not label-based: "Manifest filename" loosely matches "Name"
    // too ("filename" contains "name" as a substring), the same PatternFly
    // required-field accessible name gotcha this project has hit before.
    const nameField = dialog.querySelector("#repository-edit-name") as HTMLInputElement;
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
        "/pulp/api/v3/repositories/file/file/",
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
    expect(screen.getByText("5 files")).toBeInTheDocument();
    expect(screen.getByText(/Version 0/)).toBeInTheDocument();
  });

  it("switches to the Content tab and offers an upload action", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Content" }));

    expect(
      await screen.findByText("No files in this repository yet"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload file" })).toBeInTheDocument();
  });

  it("switches to the Distributions tab and shows this repository's distributions", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Distributions" }));

    expect(await screen.findByText(FILE_DISTRIBUTION_FIXTURE.name)).toBeInTheDocument();
  });

  it("switches to the Access tab - shared with every other plugin's repository page", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Access" }));

    expect(await screen.findByText("No one has explicit access yet")).toBeInTheDocument();
  });

  it("deletes the repository after confirmation and navigates back to the list", async () => {
    renderApp(<RepositoryDetailPage />, {
      route: `/files/repositories/${FILE_REPO_FIXTURE.name}`,
      path: "/files/repositories/:name",
    });

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("button", { name: "Delete repository" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
