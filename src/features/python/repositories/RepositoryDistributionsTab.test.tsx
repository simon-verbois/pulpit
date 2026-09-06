import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { PYTHON_DISTRIBUTION_FIXTURE, PYTHON_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoryDistributionsTab } from "./RepositoryDistributionsTab";

describe("RepositoryDistributionsTab", () => {
  it("renders only this repository's distributions", async () => {
    renderApp(<RepositoryDistributionsTab repository={PYTHON_REPO_FIXTURE} />);

    expect(await screen.findByText(PYTHON_DISTRIBUTION_FIXTURE.name)).toBeInTheDocument();
  });

  it("shows an empty state when this repository has no distributions", async () => {
    server.use(
      http.get("/pulp/api/v3/distributions/python/pypi/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RepositoryDistributionsTab repository={PYTHON_REPO_FIXTURE} />);

    expect(await screen.findByText("No distributions yet")).toBeInTheDocument();
  });

  it("creates a distribution for this repository without a repository picker", async () => {
    renderApp(<RepositoryDistributionsTab repository={PYTHON_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findByText(PYTHON_DISTRIBUTION_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create distribution" })[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "new-dist" },
    });
    fireEvent.change(within(dialog).getByLabelText("Base path", { exact: false }), {
      target: { value: "new-dist-path" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("new-dist")).toBeInTheDocument();
  });

  it("deletes a distribution after confirmation", async () => {
    renderApp(<RepositoryDistributionsTab repository={PYTHON_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findByText(PYTHON_DISTRIBUTION_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText("No distributions yet")).toBeInTheDocument(),
    );
  });
});
