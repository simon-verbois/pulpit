import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import {
  ANSIBLE_DISTRIBUTION_FIXTURE,
  ANSIBLE_REPO_FIXTURE,
} from "../../../test/handlers";
import { RepositoryDistributionsTab } from "./RepositoryDistributionsTab";

const DIST_BASE = "/pulp/api/v3/distributions/ansible/ansible/";

describe("Ansible RepositoryDistributionsTab", () => {
  it("renders only this repository's distributions with selectable ansible-galaxy client config text", async () => {
    renderApp(<RepositoryDistributionsTab repository={ANSIBLE_REPO_FIXTURE} />);

    // The fixture's name and base_path are equal strings, so both the
    // "Name" and "Base path" cells match.
    expect(await screen.findAllByText(ANSIBLE_DISTRIBUTION_FIXTURE.name)).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Show full configuration" }));
    const snippet = document.querySelector("code")?.textContent ?? "";
    expect(snippet).toContain(`server_list = ${ANSIBLE_DISTRIBUTION_FIXTURE.name}`);
    expect(snippet).toContain(`[galaxy_server.${ANSIBLE_DISTRIBUTION_FIXTURE.name}]`);
    expect(snippet).toContain(`url=${ANSIBLE_DISTRIBUTION_FIXTURE.client_url}`);
  });

  it("shows an empty state when this repository has no distributions", async () => {
    server.use(
      http.get(DIST_BASE, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RepositoryDistributionsTab repository={ANSIBLE_REPO_FIXTURE} />);

    expect(await screen.findByText("No distributions yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(http.get(DIST_BASE, () => new HttpResponse(null, { status: 502 })));

    renderApp(<RepositoryDistributionsTab repository={ANSIBLE_REPO_FIXTURE} />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("creates a distribution for this repository without a repository picker and tracks the task", async () => {
    renderApp(<RepositoryDistributionsTab repository={ANSIBLE_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findAllByText(ANSIBLE_DISTRIBUTION_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create distribution" })[0]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByLabelText(/Repository/i)).not.toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText("Name", { exact: false }),
    ).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Base path", { exact: false }), {
      target: { value: "new-dist-path" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // The task label uses just the user-entered suffix (this is also the
    // distribution's `name`), without the "ansible/" module prefix that
    // only `base_path` needs.
    expect(
      await screen.findByText('Create distribution "new-dist-path"'),
    ).toBeInTheDocument();
  });

  it("deletes a distribution after confirmation and tracks the task", async () => {
    renderApp(<RepositoryDistributionsTab repository={ANSIBLE_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findAllByText(ANSIBLE_DISTRIBUTION_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(
        `Delete distribution "${ANSIBLE_DISTRIBUTION_FIXTURE.name}"`,
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("No distributions yet")).toBeInTheDocument(),
    );
  });
});
