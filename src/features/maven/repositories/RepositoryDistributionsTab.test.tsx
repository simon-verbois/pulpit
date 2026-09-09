import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { MAVEN_DISTRIBUTION_FIXTURE, MAVEN_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoryDistributionsTab } from "./RepositoryDistributionsTab";

describe("RepositoryDistributionsTab", () => {
  it("renders only this repository's distributions", async () => {
    renderApp(<RepositoryDistributionsTab repository={MAVEN_REPO_FIXTURE} />);

    expect(await screen.findByText(MAVEN_DISTRIBUTION_FIXTURE.name)).toBeInTheDocument();
  });

  it("shows an empty state when this repository has no distributions", async () => {
    server.use(
      http.get("/pulp/api/v3/distributions/maven/maven/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RepositoryDistributionsTab repository={MAVEN_REPO_FIXTURE} />);

    expect(await screen.findByText("No distributions yet")).toBeInTheDocument();
  });

  it("creates a distribution for this repository without a repository picker, and with an optional pull-through remote", async () => {
    renderApp(<RepositoryDistributionsTab repository={MAVEN_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findByText(MAVEN_DISTRIBUTION_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create distribution" })[0]);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).queryByLabelText("Name", { exact: false }),
    ).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Base path", { exact: false }), {
      target: { value: "new-dist-path" },
    });
    expect(within(dialog).getByLabelText("Pull-through remote")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // Name and base path are now the same value (no separate Name field),
    // so this text renders twice - once per column.
    expect(await screen.findAllByText("maven/new-dist-path")).toHaveLength(2);
  });

  it("deletes a distribution after confirmation", async () => {
    renderApp(<RepositoryDistributionsTab repository={MAVEN_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findByText(MAVEN_DISTRIBUTION_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("No distributions yet")).toBeInTheDocument(),
    );
  });
});
