import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { MAVEN_REMOTE_FIXTURE } from "../../../test/handlers";
import { RemotesPage } from "./RemotesPage";

describe("RemotesPage", () => {
  it("renders the seeded remote", async () => {
    renderApp(<RemotesPage />);

    expect(await screen.findByText(MAVEN_REMOTE_FIXTURE.name)).toBeInTheDocument();
    expect(screen.getByText(MAVEN_REMOTE_FIXTURE.url)).toBeInTheDocument();
    expect(screen.getByText("immediate")).toBeInTheDocument();
  });

  it("shows an empty state when there are no remotes", async () => {
    server.use(
      http.get("/pulp/api/v3/remotes/maven/maven/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RemotesPage />);

    expect(await screen.findByText("No Maven remotes yet")).toBeInTheDocument();
  });

  it("creates a remote and shows it in the refreshed list", async () => {
    renderApp(<RemotesPage />);

    await screen.findByText(MAVEN_REMOTE_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create remote" })[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(dialog.querySelector("#remote-name") as HTMLInputElement, {
      target: { value: "new-fixture" },
    });
    fireEvent.change(dialog.querySelector("#remote-url") as HTMLInputElement, {
      target: { value: "https://repo.example.com/maven2/" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("new-fixture")).toBeInTheDocument();
  });

  it("edits a remote's URL and tracks the task", async () => {
    renderApp(<RemotesPage />, { withTasksDrawer: true });

    await screen.findByText(MAVEN_REMOTE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(dialog.querySelector("#remote-edit-url") as HTMLInputElement, {
      target: { value: "https://maven.example.com" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(`Update remote "${MAVEN_REMOTE_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("deletes a remote after confirmation", async () => {
    renderApp(<RemotesPage />, { withTasksDrawer: true });

    await screen.findByText(MAVEN_REMOTE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("No Maven remotes yet")).toBeInTheDocument(),
    );
  });
});
