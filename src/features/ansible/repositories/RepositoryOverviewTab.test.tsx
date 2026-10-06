import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { ANSIBLE_REPO_FIXTURE } from "../../../test/handlers";
import { clickRepositoryAction } from "../../../test/repositoryActions";
import { RepositoryDetailPage } from "./RepositoryDetailPage";
import { RepositoryOverviewTab } from "./RepositoryOverviewTab";

// Sign/Mark/Unmark live in the detail page's header "Actions" menu.
function renderDetail() {
  return renderApp(<RepositoryDetailPage />, {
    route: `/ansible/repositories/${ANSIBLE_REPO_FIXTURE.name}`,
    path: "/ansible/repositories/:name",
    withTasksDrawer: true,
  });
}

describe("Ansible RepositoryOverviewTab", () => {
  it("shows 'None yet' for signatures and marks when there are none", async () => {
    renderApp(
      <RepositoryOverviewTab
        repository={ANSIBLE_REPO_FIXTURE}
        onShowVersions={() => {}}
      />,
    );

    expect(await screen.findByText(ANSIBLE_REPO_FIXTURE.name)).toBeInTheDocument();
    expect(screen.getAllByText("None yet")).toHaveLength(2); // Signatures + Marks
  });

  it("signs the repository's content and tracks the task", async () => {
    server.use(
      http.get("/pulp/api/v3/signing-services/", () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: "/pulp/api/v3/signing-services/sig-1/",
              name: "test-signing-service",
            },
          ],
        }),
      ),
    );

    renderDetail();

    await clickRepositoryAction("Sign content…");
    const dialog = await screen.findByRole("dialog");
    // The <select> options populate asynchronously once the signing
    // services query resolves - wait for the real option before selecting
    // it, otherwise the value is set on a <select> with no matching
    // <option> yet and the change is silently dropped.
    await within(dialog).findByRole("option", { name: "test-signing-service" });
    fireEvent.change(within(dialog).getByLabelText("Signing service", { exact: false }), {
      target: { value: "/pulp/api/v3/signing-services/sig-1/" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(`Sign content in "${ANSIBLE_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("marks the repository's content and tracks the task", async () => {
    renderDetail();

    await clickRepositoryAction("Mark content…");
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Value", { exact: false }), {
      target: { value: "certified" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(
        `Mark content "certified" in "${ANSIBLE_REPO_FIXTURE.name}"`,
      ),
    ).toBeInTheDocument();
  });

  it("unmarks the repository's content and tracks the task", async () => {
    renderDetail();

    await clickRepositoryAction("Unmark content…");
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Value", { exact: false }), {
      target: { value: "certified" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Unmark" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(
        `Unmark content "certified" in "${ANSIBLE_REPO_FIXTURE.name}"`,
      ),
    ).toBeInTheDocument();
  });

  it("shows the signature count and mark labels when present", async () => {
    server.use(
      http.get("/pulp/api/v3/content/ansible/collection_signatures/", () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: "/pulp/api/v3/content/ansible/collection_signatures/sig-1/",
              signed_collection: "/pulp/api/v3/content/ansible/collection_versions/cv-1/",
              pubkey_fingerprint: "ABCD1234",
              signing_service: "/pulp/api/v3/signing-services/sig-1/",
              pulp_created: "2026-08-20T11:00:00.000000Z",
            },
          ],
        }),
      ),
      http.get("/pulp/api/v3/content/ansible/collection_marks/", () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: "/pulp/api/v3/content/ansible/collection_marks/mark-1/",
              marked_collection: "/pulp/api/v3/content/ansible/collection_versions/cv-1/",
              value: "certified",
              pulp_created: "2026-08-20T11:00:00.000000Z",
            },
          ],
        }),
      ),
    );

    renderApp(
      <RepositoryOverviewTab
        repository={ANSIBLE_REPO_FIXTURE}
        onShowVersions={() => {}}
      />,
    );

    expect(await screen.findByText("1 collection version signed")).toBeInTheDocument();
    expect(screen.getByText("certified")).toBeInTheDocument();
  });
});
