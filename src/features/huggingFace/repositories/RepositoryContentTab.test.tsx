import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

import { renderApp } from "../../../test/renderApp";
import { HF_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoryContentTab } from "./RepositoryContentTab";

describe("RepositoryContentTab", () => {
  it("uploads a file with a repo id, tracks the modify task, and shows the completion in the drawer", async () => {
    renderApp(<RepositoryContentTab repository={HF_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    expect(
      await screen.findByText("No files in this repository yet"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Upload file" }));

    const dialog = await screen.findByRole("dialog");
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["file-bytes"], "config.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.change(dialog.querySelector("#content-repo-id") as HTMLInputElement, {
      target: { value: "bert-base-uncased" },
    });

    const uploadButton = screen.getByRole("button", { name: "Upload" });
    await waitFor(() => expect(uploadButton).not.toBeDisabled());
    fireEvent.click(uploadButton);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(`Add "config.json" to "${HF_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });
});
