import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { CONTAINER_REMOTE_FIXTURE } from "../../../test/handlers";
import { RemotesPage } from "./RemotesPage";

const BASE = "/pulp/api/v3/remotes/container/container/";

describe("Container RemotesPage", () => {
  it("renders the seeded remote", async () => {
    renderApp(<RemotesPage />);

    expect(await screen.findByText(CONTAINER_REMOTE_FIXTURE.name)).toBeInTheDocument();
    expect(screen.getByText(CONTAINER_REMOTE_FIXTURE.upstream_name)).toBeInTheDocument();
  });

  it("shows an empty state when there are no remotes", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RemotesPage />);

    expect(await screen.findByText("No container remotes yet")).toBeInTheDocument();
  });

  it("creates a remote with a required upstream image name and tracks it appearing", async () => {
    renderApp(<RemotesPage />);

    await screen.findByText(CONTAINER_REMOTE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Create remote" }));

    const dialog = await screen.findByRole("dialog");
    const submitButton = within(dialog).getByRole("button", { name: "Create" });
    expect(submitButton).toBeDisabled();

    // "Name" is also a substring of "Upstream image name" - match the start
    // of the label to avoid an ambiguous multi-match.
    fireEvent.change(within(dialog).getByLabelText(/^Name\b/), {
      target: { value: "new-container-remote" },
    });
    fireEvent.change(within(dialog).getByLabelText("Registry URL", { exact: false }), {
      target: { value: "https://ghcr.io" },
    });
    fireEvent.change(
      within(dialog).getByLabelText("Upstream image name", { exact: false }),
      {
        target: { value: "pulp/hello-world" },
      },
    );
    expect(submitButton).not.toBeDisabled();
    fireEvent.click(submitButton);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("deletes a remote after confirmation", async () => {
    renderApp(<RemotesPage />, { withTasksDrawer: true });

    await screen.findByText(CONTAINER_REMOTE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("No container remotes yet")).toBeInTheDocument(),
    );
  });
});
