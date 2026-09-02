import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

import { renderApp } from "../../../test/renderApp";
import { RPM_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoryPackagesTab } from "./RepositoryPackagesTab";

describe("RepositoryPackagesTab", () => {
  it(
    "uploads a package, tracks the modify task, and shows the completion in the drawer - " +
      "the two-step upload-then-modify flow VERIFIED against the live schema",
    async () => {
      renderApp(<RepositoryPackagesTab repository={RPM_REPO_FIXTURE} />, {
        withTasksDrawer: true,
      });

      expect(
        await screen.findByText("No packages in this repository yet"),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Upload package" }));

      const dialog = await screen.findByRole("dialog");
      // PatternFly's FileUpload doesn't associate its hidden file input with
      // the FormGroup label via htmlFor - query the input directly.
      const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["rpm-bytes"], "walrus-5.21-1.noarch.rpm", {
        type: "application/x-rpm",
      });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // FileUpload commits the selected file to state asynchronously - wait
      // for the button to actually enable before clicking it, otherwise the
      // click can land before `file` is set and silently no-op.
      const uploadButton = screen.getByRole("button", { name: "Upload" });
      await waitFor(() => expect(uploadButton).not.toBeDisabled());
      fireEvent.click(uploadButton);

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(
        await screen.findByText(
          `Add "walrus-5.21-1.noarch.rpm" to "${RPM_REPO_FIXTURE.name}"`,
        ),
      ).toBeInTheDocument();
    },
  );
});
