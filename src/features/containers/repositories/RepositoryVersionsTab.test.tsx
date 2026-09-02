import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { CONTAINER_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoryVersionsTab } from "./RepositoryVersionsTab";

const OTHER_REPO = {
  ...CONTAINER_REPO_FIXTURE,
  pulp_href: "/pulp/api/v3/repositories/container/container/other-repo/",
  name: "other-container-repo",
};

describe("Container RepositoryVersionsTab", () => {
  it("shows synced content per version, with a copy action only on the current version", async () => {
    renderApp(<RepositoryVersionsTab repository={CONTAINER_REPO_FIXTURE} />);

    expect(await screen.findByText(/Version 1/)).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText(/1 tags, 1 manifests/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Copy to…" })).toHaveLength(1);
  });

  it(
    "copies the current version's tags and manifests to another repository as two tracked tasks - " +
      "pulp_container splits these into separate endpoints, unlike RPM/Ansible's single copy action",
    async () => {
      server.use(
        http.get("/pulp/api/v3/repositories/container/container/", () =>
          HttpResponse.json({
            count: 2,
            next: null,
            previous: null,
            results: [CONTAINER_REPO_FIXTURE, OTHER_REPO],
          }),
        ),
      );

      renderApp(<RepositoryVersionsTab repository={CONTAINER_REPO_FIXTURE} />, {
        withTasksDrawer: true,
      });

      await screen.findByText(/Version 1/);
      fireEvent.click(screen.getByRole("button", { name: "Copy to…" }));

      const dialog = await screen.findByRole("dialog");
      const destSelect = await within(dialog).findByLabelText("Destination repository", {
        exact: false,
      });
      expect(
        within(destSelect).queryByText(CONTAINER_REPO_FIXTURE.name),
      ).not.toBeInTheDocument();
      fireEvent.change(destSelect, { target: { value: OTHER_REPO.pulp_href } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Copy" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(
        await screen.findByText(`Copy tags to "${OTHER_REPO.name}"`),
      ).toBeInTheDocument();
      expect(
        screen.getByText(`Copy manifests to "${OTHER_REPO.name}"`),
      ).toBeInTheDocument();
    },
  );
});
