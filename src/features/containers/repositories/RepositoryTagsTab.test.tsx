import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import {
  CONTAINER_MANIFEST_FIXTURE,
  CONTAINER_REPO_FIXTURE,
  CONTAINER_TAG_FIXTURE,
} from "../../../test/handlers";
import { RepositoryTagsTab } from "./RepositoryTagsTab";

describe("RepositoryTagsTab", () => {
  it("tags a manifest with a new tag name and tracks the task", async () => {
    renderApp(<RepositoryTagsTab repository={CONTAINER_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    expect(await screen.findByText(CONTAINER_TAG_FIXTURE.name)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tag image…" }));

    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("option", {
      name: CONTAINER_MANIFEST_FIXTURE.digest,
    });
    fireEvent.change(within(dialog).getByLabelText("Manifest", { exact: false }), {
      target: { value: CONTAINER_MANIFEST_FIXTURE.digest },
    });
    fireEvent.change(within(dialog).getByLabelText("Tag name", { exact: false }), {
      target: { value: "v1.0" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Tag" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(`Tag "v1.0" in "${CONTAINER_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });

  it("removes a tag and tracks the task", async () => {
    renderApp(<RepositoryTagsTab repository={CONTAINER_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    await screen.findByText(CONTAINER_TAG_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(
      await screen.findByText(
        `Remove tag "${CONTAINER_TAG_FIXTURE.name}" from "${CONTAINER_REPO_FIXTURE.name}"`,
      ),
    ).toBeInTheDocument();
  });

  it("shows an empty state when this repository has no tags yet", async () => {
    server.use(
      http.get("/pulp/api/v3/content/container/tags/", () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RepositoryTagsTab repository={CONTAINER_REPO_FIXTURE} />);

    expect(await screen.findByText("No tags in this repository yet")).toBeInTheDocument();
  });
});
