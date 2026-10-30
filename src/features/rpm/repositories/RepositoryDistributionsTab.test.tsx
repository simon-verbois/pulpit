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
    expect(within(dialog).getByLabelText("Name", { exact: false })).toHaveValue(
      RPM_REPO_FIXTURE.name,
    );
    expect(within(dialog).getByLabelText("Base path", { exact: false })).toHaveValue(
      `rpm/${RPM_REPO_FIXTURE.name}`,
    );
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
    expect(within(dialog).getByLabelText("Base path", { exact: false })).toHaveValue(
      `rpm/${RPM_REPO_FIXTURE.name}-v0`,
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByRole("cell", {
        name: `${RPM_REPO_FIXTURE.name}-v0`,
      }),
    ).toBeInTheDocument();
  });

  it("creates a pinned distribution under a custom name", async () => {
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
    const nameInput = within(dialog).getByLabelText("Name", { exact: false });
    expect(nameInput).toHaveValue(`${RPM_REPO_FIXTURE.name}-v0`);
    fireEvent.change(nameInput, { target: { value: "ol9-baseos-2026-10" } });
    expect(
      within(dialog).getByText(/\/pulp\/content\/rpm\/ol9-baseos-2026-10\/$/),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByRole("cell", { name: "ol9-baseos-2026-10" }),
    ).toBeInTheDocument();
  });

  it("keeps spaces in the name but not in the base path", async () => {
    renderApp(<RepositoryDistributionsTab repository={RPM_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findByText(RPM_DISTRIBUTION_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create distribution" })[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "Oracle Linux 9 BaseOS Latest" },
    });
    expect(
      within(dialog).getByText(/\/pulp\/content\/rpm\/Oracle-Linux-9-BaseOS-Latest\/$/),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByRole("cell", { name: "Oracle Linux 9 BaseOS Latest" }),
    ).toBeInTheDocument();
  });

  it("serves the distribution under a full custom base path", async () => {
    renderApp(<RepositoryDistributionsTab repository={RPM_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findByText(RPM_DISTRIBUTION_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create distribution" })[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Base path", { exact: false }), {
      target: { value: "OracleLinux/OL8/baseos/latest/x86_64" },
    });
    expect(
      within(dialog).getByText(
        /\/pulp\/content\/OracleLinux\/OL8\/baseos\/latest\/x86_64\/$/,
      ),
    ).toBeInTheDocument();
  });

  it("keeps the dialog open when the distribution name is taken", async () => {
    renderApp(<RepositoryDistributionsTab repository={RPM_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findByText(RPM_DISTRIBUTION_FIXTURE.name);
    fireEvent.click(screen.getAllByRole("button", { name: "Create distribution" })[0]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByLabelText("Pin a repository version"));
    await within(dialog).findByLabelText("Repository version");
    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: RPM_DISTRIBUTION_FIXTURE.name },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    expect(await within(dialog).findByText(/already exists/)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
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

it.each(["latest", "pinned"])(
  "offers an explicit reconnect for an unused %s distribution",
  async (mode) => {
    const name = RPM_REPO_FIXTURE.name;
    const unused = {
      ...RPM_DISTRIBUTION_FIXTURE,
      name,
      base_path: `rpm/${name.replaceAll(" ", "-")}`,
      repository: null,
      publication: null,
    };
    let reconnect: unknown;
    let creates = 0;
    server.use(
      http.get("/pulp/api/v3/distributions/rpm/rpm/", () =>
        HttpResponse.json({ count: 1, next: null, previous: null, results: [unused] }),
      ),
      http.post("/pulp/api/v3/distributions/rpm/rpm/", () => {
        creates++;
        return HttpResponse.json({}, { status: 400 });
      }),
      http.patch(unused.pulp_href, async ({ request }) => {
        reconnect = await request.json();
        return HttpResponse.json(
          { task: "/pulp/api/v3/tasks/reconnect/" },
          { status: 202 },
        );
      }),
      http.get("/pulp/api/v3/tasks/reconnect/", () =>
        HttpResponse.json({
          pulp_href: "/pulp/api/v3/tasks/reconnect/",
          state: "completed",
          name: "reconnect",
          created_resources: [],
        }),
      ),
    );
    renderApp(<RepositoryDistributionsTab repository={RPM_REPO_FIXTURE} />);
    fireEvent.click(await screen.findByRole("button", { name: "Create distribution" }));
    const dialog = await screen.findByRole("dialog");
    if (mode === "pinned") {
      fireEvent.click(within(dialog).getByLabelText("Pin a repository version"));
      await within(dialog).findByLabelText("Repository version");
      fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
        target: { value: name },
      });
    }
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));
    const button = await within(dialog).findByRole("button", {
      name: "Reconnect",
    });
    expect(reconnect).toBeUndefined();
    expect(creates).toBe(0);
    fireEvent.click(button);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(reconnect).toMatchObject(
        mode === "pinned"
          ? { repository: null, publication: expect.any(String) }
          : { repository: RPM_REPO_FIXTURE.pulp_href, publication: null },
      ),
    );
    expect(creates).toBe(0);
  },
);

it("does not take over a conflicting distribution that still serves content", async () => {
  let writes = 0;
  const occupied = {
    ...RPM_DISTRIBUTION_FIXTURE,
    name: RPM_REPO_FIXTURE.name,
    repository: "/pulp/api/v3/repositories/rpm/rpm/another/",
  };
  server.use(
    http.get("/pulp/api/v3/distributions/rpm/rpm/", () =>
      HttpResponse.json({ count: 1, next: null, previous: null, results: [occupied] }),
    ),
    http.post("/pulp/api/v3/distributions/rpm/rpm/", () => {
      writes++;
      return HttpResponse.json({}, { status: 400 });
    }),
  );
  renderApp(<RepositoryDistributionsTab repository={RPM_REPO_FIXTURE} />);
  fireEvent.click(await screen.findByRole("button", { name: "Create distribution" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));
  expect(
    await within(dialog).findByText(/still connected to content/),
  ).toBeInTheDocument();
  expect(
    within(dialog).queryByRole("button", { name: "Reconnect" }),
  ).not.toBeInTheDocument();
  expect(writes).toBe(0);
});
