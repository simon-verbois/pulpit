import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import {
  CONTAINER_DISTRIBUTION_FIXTURE,
  CONTAINER_REPO_FIXTURE,
} from "../../../test/handlers";
import { RepositoryDistributionsTab } from "./RepositoryDistributionsTab";

const DIST_BASE = "/pulp/api/v3/distributions/container/container/";

describe("Container RepositoryDistributionsTab", () => {
  it("renders only this repository's distributions, with a copyable pull command", async () => {
    renderApp(<RepositoryDistributionsTab repository={CONTAINER_REPO_FIXTURE} />);

    expect(await screen.findAllByText(CONTAINER_DISTRIBUTION_FIXTURE.name)).toHaveLength(
      2,
    );
    expect(
      screen.getByText(`podman pull ${CONTAINER_DISTRIBUTION_FIXTURE.registry_path}`),
    ).toBeInTheDocument();
  });

  it("shows an empty state when this repository has no distributions", async () => {
    server.use(
      http.get(DIST_BASE, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RepositoryDistributionsTab repository={CONTAINER_REPO_FIXTURE} />);

    expect(await screen.findByText("No distributions yet")).toBeInTheDocument();
  });

  it("creates a distribution for this repository and tracks the task", async () => {
    renderApp(<RepositoryDistributionsTab repository={CONTAINER_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findAllByText(CONTAINER_DISTRIBUTION_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create distribution" })[0]);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).queryByLabelText("Name", { exact: false }),
    ).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Base path", { exact: false }), {
      target: { value: "new-dist-path" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText('Create distribution "new-dist-path"'),
    ).toBeInTheDocument();
  });

  it(
    "warns that deleting a distribution also deletes its repository (VERIFIED live pulp_container " +
      "behavior), then navigates away on confirm since the repository is gone too",
    async () => {
      renderApp(<RepositoryDistributionsTab repository={CONTAINER_REPO_FIXTURE} />, {
        withTasksDrawer: true,
        route: "/containers/repositories/x",
        path: "/containers/repositories/x",
      });

      await screen.findAllByText(CONTAINER_DISTRIBUTION_FIXTURE.name);
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText(/also deletes/i)).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      // Navigated away (the tab itself, mounted at this route, is gone).
      await waitFor(() =>
        expect(screen.queryByText("Pull command")).not.toBeInTheDocument(),
      );
      expect(
        await screen.findByText(
          `Delete distribution "${CONTAINER_DISTRIBUTION_FIXTURE.name}"`,
        ),
      ).toBeInTheDocument();
    },
  );
});
