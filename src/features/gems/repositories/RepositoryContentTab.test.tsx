import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

import { renderApp } from "../../../test/renderApp";
import { GEM_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoryContentTab } from "./RepositoryContentTab";

describe("RepositoryContentTab", () => {
  it("uploads a gem, tracks the modify task, and shows the completion in the drawer", async () => {
    renderApp(<RepositoryContentTab repository={GEM_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    expect(await screen.findByText("No gems in this repository yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Upload gem" }));

    const dialog = await screen.findByRole("dialog");
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["gem-bytes"], "rails-7.1.0.gem", {
      type: "application/octet-stream",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadButton = screen.getByRole("button", { name: "Upload" });
    await waitFor(() => expect(uploadButton).not.toBeDisabled());
    fireEvent.click(uploadButton);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(`Add "rails-7.1.0.gem" to "${GEM_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });
});
