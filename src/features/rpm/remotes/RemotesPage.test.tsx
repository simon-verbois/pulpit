import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { RPM_REMOTE_FIXTURE } from "../../../test/handlers";
import { RemotesPage } from "./RemotesPage";

describe("RemotesPage", () => {
  it("renders the seeded remote", async () => {
    renderApp(<RemotesPage />);

    expect(await screen.findByText(RPM_REMOTE_FIXTURE.name)).toBeInTheDocument();
    expect(screen.getByText(RPM_REMOTE_FIXTURE.url)).toBeInTheDocument();
    expect(screen.getByText("immediate")).toBeInTheDocument();
  });

  it("shows an empty state when there are no remotes", async () => {
    server.use(
      http.get("/pulp/api/v3/remotes/rpm/rpm/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RemotesPage />);

    expect(await screen.findByText("No RPM remotes yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(
      http.get(
        "/pulp/api/v3/remotes/rpm/rpm/",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    renderApp(<RemotesPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("creates a remote and shows it in the refreshed list", async () => {
    renderApp(<RemotesPage />);

    await screen.findByText(RPM_REMOTE_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create remote" })[0]);

    const dialog = await screen.findByRole("dialog");
    // id-based, not label-based: "Name" loosely matches "Origin server
    // username"/"Proxy username" too (both labels contain "...ername"...
    // "name" as a substring), the same PatternFly required-field accessible
    // name gotcha this project has hit before, just via a different cause.
    fireEvent.change(dialog.querySelector("#remote-name") as HTMLInputElement, {
      target: { value: "new-fixture" },
    });
    fireEvent.change(dialog.querySelector("#remote-url") as HTMLInputElement, {
      target: { value: "https://fixtures.pulpproject.org/rpm-signed/" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("new-fixture")).toBeInTheDocument();
  });

  it("shows the API error inline when creating a remote fails", async () => {
    server.use(
      http.post("/pulp/api/v3/remotes/rpm/rpm/", () =>
        HttpResponse.json({ name: ["This field must be unique."] }, { status: 400 }),
      ),
    );
    renderApp(<RemotesPage />);

    await screen.findByText(RPM_REMOTE_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create remote" })[0]);

    const dialog = await screen.findByRole("dialog");
    // id-based, not label-based: "Name" loosely matches "Origin server
    // username"/"Proxy username" too (both labels contain "...ername"...
    // "name" as a substring), the same PatternFly required-field accessible
    // name gotcha this project has hit before, just via a different cause.
    fireEvent.change(dialog.querySelector("#remote-name") as HTMLInputElement, {
      target: { value: "test-fixture" },
    });
    fireEvent.change(dialog.querySelector("#remote-url") as HTMLInputElement, {
      target: { value: "https://example.com/" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    expect(
      await within(dialog).findByText(/Pulp rejected the request as invalid/i),
    ).toBeInTheDocument();
  });

  it("edits a remote's proxy settings and tracks the task", async () => {
    renderApp(<RemotesPage />, { withTasksDrawer: true });

    await screen.findByText(RPM_REMOTE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /advanced connection settings/i }),
    );
    fireEvent.change(dialog.querySelector("#edit-remote-proxy-url") as HTMLInputElement, {
      target: { value: "http://proxy.example.com:3128" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(`Update remote "${RPM_REMOTE_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("deletes a remote after confirmation", async () => {
    renderApp(<RemotesPage />, { withTasksDrawer: true });

    await screen.findByText(RPM_REMOTE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(RPM_REMOTE_FIXTURE.name)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("No RPM remotes yet")).toBeInTheDocument(),
    );
  });

  it("switches to ULN remotes, creates one, and shows it in the refreshed list", async () => {
    renderApp(<RemotesPage />);

    await screen.findByText(RPM_REMOTE_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "ULN" }));

    expect(await screen.findByText("No ULN remotes yet")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Create ULN remote" })[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(dialog.querySelector("#uln-remote-name") as HTMLInputElement, {
      target: { value: "uln-fixture" },
    });
    fireEvent.change(dialog.querySelector("#uln-remote-url") as HTMLInputElement, {
      target: { value: "uln://el7_x86_64_oracle_ksplice" },
    });
    fireEvent.change(
      dialog.querySelector("#uln-remote-server-base-url") as HTMLInputElement,
      {
        target: { value: "https://linux-update.oracle.com/" },
      },
    );
    fireEvent.change(dialog.querySelector("#uln-remote-username") as HTMLInputElement, {
      target: { value: "test" },
    });
    fireEvent.change(dialog.querySelector("#uln-remote-password") as HTMLInputElement, {
      target: { value: "test" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("uln-fixture")).toBeInTheDocument();
  });
});
