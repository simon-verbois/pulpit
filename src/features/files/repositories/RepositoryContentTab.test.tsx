import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

import { renderApp } from "../../../test/renderApp";
import { FILE_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoryContentTab } from "./RepositoryContentTab";

describe("RepositoryContentTab", () => {
  it(
    "uploads a file, tracks the modify task, and shows the completion in the drawer - " +
      "the two-step upload-then-modify flow, same as every other plugin's upload",
    async () => {
      renderApp(<RepositoryContentTab repository={FILE_REPO_FIXTURE} />, {
        withTasksDrawer: true,
      });

      expect(
        await screen.findByText("No files in this repository yet"),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Upload file" }));

      const dialog = await screen.findByRole("dialog");
      // PatternFly's FileUpload doesn't associate its hidden file input with
      // the FormGroup label via htmlFor - query the input directly.
      const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["file-bytes"], "logo.png", { type: "image/png" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // FileUpload commits the selected file to state asynchronously - wait
      // for the button to actually enable before clicking it, otherwise the
      // click can land before `file` is set and silently no-op.
      const uploadButton = screen.getByRole("button", { name: "Upload" });
      await waitFor(() => expect(uploadButton).not.toBeDisabled());
      fireEvent.click(uploadButton);

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(
        await screen.findByText(`Add "logo.png" to "${FILE_REPO_FIXTURE.name}"`),
      ).toBeInTheDocument();
    },
  );
});
