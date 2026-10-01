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
    expect(
      screen.queryByRole("columnheader", { name: "Base path" }),
    ).not.toBeInTheDocument();
  });

  it("also renders distributions pinned through this repository's publications", async () => {
    const publicationHref = "/pulp/api/v3/publications/rpm/rpm/publication-1/";
    const pinned = {
      ...RPM_DISTRIBUTION_FIXTURE,
      pulp_href: "/pulp/api/v3/distributions/rpm/rpm/pinned/",
      name: "pinned-version",
      base_path: "rpm/pinned-version",
      repository: null,
      publication: publicationHref,
    };
    server.use(
      http.get("/pulp/api/v3/distributions/rpm/rpm/", () =>
        HttpResponse.json({
          count: 2,
          next: null,
          previous: null,
          results: [RPM_DISTRIBUTION_FIXTURE, pinned],
        }),
      ),
      http.get("/pulp/api/v3/publications/rpm/rpm/", () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: publicationHref,
              repository: RPM_REPO_FIXTURE.pulp_href,
              repository_version: `${RPM_REPO_FIXTURE.versions_href}0/`,
            },
          ],
        }),
      ),
    );

    renderApp(<RepositoryDistributionsTab repository={RPM_REPO_FIXTURE} />);

    expect(await screen.findByText("pinned-version")).toBeInTheDocument();
    expect(screen.getByText(RPM_DISTRIBUTION_FIXTURE.name)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1 - 2 of 2/ })).toBeInTheDocument();
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
    expect(
      within(dialog).queryByLabelText("Repository", { exact: true }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText("Name", { exact: false }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText("Base path", { exact: false }),
    ).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByRole("cell", { name: RPM_REPO_FIXTURE.name }),
    ).toBeInTheDocument();
  });

  it("creates a distribution pinned to a retained repository version", async () => {
    renderApp(<RepositoryDistributionsTab repository={RPM_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findByText(RPM_DISTRIBUTION_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create distribution" })[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByLabelText("Pin a repository version"));

    const versionSelect = await within(dialog).findByLabelText("Repository version");
    fireEvent.change(versionSelect, {
      target: { value: `${RPM_REPO_FIXTURE.versions_href}0/` },
    });
    expect(
      within(dialog).queryByLabelText("Base path", { exact: false }),
    ).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByRole("cell", {
        name: `${RPM_REPO_FIXTURE.name}-v0`,
      }),
    ).toBeInTheDocument();
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
