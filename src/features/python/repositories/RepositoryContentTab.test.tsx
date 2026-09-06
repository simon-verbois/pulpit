import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

import { renderApp } from "../../../test/renderApp";
import { PYTHON_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoryContentTab } from "./RepositoryContentTab";

describe("RepositoryContentTab", () => {
  it("uploads a package with a relative path, tracks the (one-shot, async) task, and shows completion in the drawer", async () => {
    renderApp(<RepositoryContentTab repository={PYTHON_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    expect(
      await screen.findByText("No packages in this repository yet"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Upload package" }));

    const dialog = await screen.findByRole("dialog");
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["wheel-bytes"], "my_package-2.0-py3-none-any.whl", {
      type: "application/zip",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const relativePathField = dialog.querySelector(
      "#content-relative-path",
    ) as HTMLInputElement;
    // FileUpload commits the selected file to state asynchronously - wait for
    // it to auto-fill the relative path with the filename before proceeding,
    // otherwise a click landing before that default is set silently no-ops.
    await waitFor(() =>
      expect(relativePathField).toHaveValue("my_package-2.0-py3-none-any.whl"),
    );

    const uploadButton = screen.getByRole("button", { name: "Upload" });
    await waitFor(() => expect(uploadButton).not.toBeDisabled());
    fireEvent.click(uploadButton);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(
        `Add "my_package-2.0-py3-none-any.whl" to "${PYTHON_REPO_FIXTURE.name}"`,
      ),
    ).toBeInTheDocument();
  });
});
