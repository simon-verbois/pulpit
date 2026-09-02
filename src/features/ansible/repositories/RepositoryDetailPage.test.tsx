import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import {
  ANSIBLE_DISTRIBUTION_FIXTURE,
  ANSIBLE_REPO_FIXTURE,
} from "../../../test/handlers";
import { RepositoryDetailPage } from "./RepositoryDetailPage";

function renderDetail(name = ANSIBLE_REPO_FIXTURE.name) {
  return renderApp(<RepositoryDetailPage />, {
    route: `/ansible/repositories/${name}`,
    path: "/ansible/repositories/:name",
    withTasksDrawer: true,
  });
}

describe("Ansible RepositoryDetailPage", () => {
  it("shows the overview tab by default with the repository's details - no publish concept, unlike RPM", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    expect(
      screen.getByRole("heading", { name: ANSIBLE_REPO_FIXTURE.name }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(ANSIBLE_REPO_FIXTURE.description as string)).toHaveLength(
      2,
    );
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
      await screen.findByText(`Update repository "${ANSIBLE_REPO_FIXTURE.name}"`),
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
    fireEvent.change(nameField, { target: { value: "renamed-ansible-repo" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByRole("heading", { name: "renamed-ansible-repo" }),
    ).toBeInTheDocument();
  });

  it("shows a not-found state for a repository name that doesn't exist", async () => {
    renderDetail("does-not-exist");

    expect(await screen.findByText("Repository not found")).toBeInTheDocument();
  });

  it("shows a normalized error state when the lookup fails", async () => {
    server.use(
      http.get(
        "/pulp/api/v3/repositories/ansible/ansible/",
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
    expect(screen.getByText(/1 collections, 1 roles/)).toBeInTheDocument();
  });

  it("switches to the Collections tab and offers an upload action", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Collections" }));

    // "demo" (not the shared "pulpit_test" namespace, also used by the Roles
    // fixture) - PatternFly keeps every tab panel mounted, so a query on a
    // value shared across fixtures would ambiguously match both.
    expect(await screen.findByText("demo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload collection" })).toBeInTheDocument();
  });

  it("switches to the Roles tab and offers an upload action", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Roles" }));

    expect(await screen.findByText("testrole")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload role" })).toBeInTheDocument();
  });

  it("switches to the Distributions tab and shows this repository's distributions", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Distributions" }));

    // The fixture's name and base_path are equal strings, so both the
    // "Name" and "Base path" cells match - assert there are exactly two.
    expect(await screen.findAllByText(ANSIBLE_DISTRIBUTION_FIXTURE.name)).toHaveLength(2);
  });

  it("switches to the Access tab - shared with RPM/Container repository pages", async () => {
    renderDetail();

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("tab", { name: "Access" }));

    expect(await screen.findByText("No one has explicit access yet")).toBeInTheDocument();
  });

  it("deletes the repository after confirmation and navigates back to the list", async () => {
    renderApp(<RepositoryDetailPage />, {
      route: `/ansible/repositories/${ANSIBLE_REPO_FIXTURE.name}`,
      path: "/ansible/repositories/:name",
    });

    await screen.findByRole("tab", { name: "Overview" });
    fireEvent.click(screen.getByRole("button", { name: "Delete repository" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
