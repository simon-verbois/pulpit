import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { RPM_DISTRIBUTION_FIXTURE, RPM_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoryDistributionsTab } from "./RepositoryDistributionsTab";

describe("RepositoryDistributionsTab", () => {
  it("renders only this repository's distributions", async () => {
    renderApp(<RepositoryDistributionsTab repository={RPM_REPO_FIXTURE} />);

    expect(await screen.findByText(RPM_DISTRIBUTION_FIXTURE.name)).toBeInTheDocument();
    expect(screen.getByText(RPM_DISTRIBUTION_FIXTURE.base_path)).toBeInTheDocument();
  });

  it("shows an empty state when this repository has no distributions", async () => {
    server.use(
      http.get("/pulp/api/v3/distributions/rpm/rpm/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RepositoryDistributionsTab repository={RPM_REPO_FIXTURE} />);

    expect(await screen.findByText("No distributions yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(
      http.get(
        "/pulp/api/v3/distributions/rpm/rpm/",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    renderApp(<RepositoryDistributionsTab repository={RPM_REPO_FIXTURE} />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("creates a distribution for this repository without a repository picker", async () => {
    renderApp(<RepositoryDistributionsTab repository={RPM_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findByText(RPM_DISTRIBUTION_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create distribution" })[0]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByLabelText(/Repository/i)).not.toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText("Name", { exact: false }),
    ).not.toBeInTheDocument();
    // The base-path prefix reflects Pulp's own CONTENT_ORIGIN
    // (content_settings.content_origin from /pulp/api/v3/status/) - what a
    // created distribution's real base_url is actually built from - not
    // window.location.origin, which can differ from it in a real deployment
    // where CONTENT_ORIGIN isn't configured to match the public origin.
    expect(
      await within(dialog).findByText("http://pulp.example.com:8080/pulp/content/rpm/"),
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Base path", { exact: false }), {
      target: { value: "new-dist-path" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // Base path keeps the "rpm/" module prefix...
    expect(await screen.findByText("rpm/new-dist-path")).toBeInTheDocument();
    // ...but Name reuses just the user-entered suffix (no separate Name
    // field in this form), without that prefix.
    expect(await screen.findByText("new-dist-path")).toBeInTheDocument();
  });

  it("deletes a distribution after confirmation", async () => {
    renderApp(<RepositoryDistributionsTab repository={RPM_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findByText(RPM_DISTRIBUTION_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("No distributions yet")).toBeInTheDocument(),
    );
  });
});
