import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import {
  RPM_MODULEMD_FIXTURE,
  RPM_PACKAGE_CATEGORY_FIXTURE,
  RPM_PACKAGE_GROUP_FIXTURE,
  RPM_REPO_FIXTURE,
} from "../../../test/handlers";
import { RepositoryContentTab } from "./RepositoryContentTab";

describe("RepositoryContentTab", () => {
  it("shows a count per content type and expands to show its rows", async () => {
    renderApp(<RepositoryContentTab repository={RPM_REPO_FIXTURE} />);

    const groupsToggle = await screen.findByRole("button", {
      name: /Package groups \(1\)/,
    });
    const categoriesToggle = screen.getByRole("button", {
      name: /Package categories \(1\)/,
    });
    const modulemdToggle = screen.getByRole("button", { name: /Modulemd \(1\)/ });

    fireEvent.click(groupsToggle);
    // The fixture's id and name are both "birds" (realistic - comps.xml
    // groups commonly have identical id/name), so this appears in both the
    // ID and Name columns.
    expect(await screen.findAllByText(RPM_PACKAGE_GROUP_FIXTURE.name)).toHaveLength(2);

    fireEvent.click(categoriesToggle);
    // Same id/name collision as the group above.
    expect(await screen.findAllByText(RPM_PACKAGE_CATEGORY_FIXTURE.id)).toHaveLength(2);

    fireEvent.click(modulemdToggle);
    // "postgresql" alone also appears in the (collapsed, but still present
    // in the DOM per PatternFly's ExpandableSection) modulemd defaults/
    // obsoletes fixtures - use the modulemd's unique context value instead.
    expect(await screen.findByText(RPM_MODULEMD_FIXTURE.context)).toBeInTheDocument();
  });

  it("shows a 'none' note for an empty content type once expanded", async () => {
    server.use(
      http.get("/pulp/api/v3/content/rpm/modulemd_defaults/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RepositoryContentTab repository={RPM_REPO_FIXTURE} />);

    const toggle = await screen.findByRole("button", { name: /Modulemd defaults \(0\)/ });
    fireEvent.click(toggle);

    expect(await screen.findByText("None in this repository.")).toBeInTheDocument();
  });

  it("uploads a comps.xml file and tracks the task", async () => {
    renderApp(<RepositoryContentTab repository={RPM_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findByRole("button", { name: /Package groups/ });
    fireEvent.click(screen.getByRole("button", { name: "Upload comps.xml" }));

    const dialog = await screen.findByRole("dialog");
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["<comps/>"], "comps.xml", { type: "text/xml" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadButton = screen.getByRole("button", { name: "Upload" });
    await waitFor(() => expect(uploadButton).not.toBeDisabled());
    fireEvent.click(uploadButton);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(`Add "comps.xml" to "${RPM_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });
});
