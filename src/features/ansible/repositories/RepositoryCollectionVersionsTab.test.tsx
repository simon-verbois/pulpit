import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

import { renderApp } from "../../../test/renderApp";
import { ANSIBLE_REPO_FIXTURE, COLLECTION_VERSION_FIXTURE } from "../../../test/handlers";
import { RepositoryCollectionVersionsTab } from "./RepositoryCollectionVersionsTab";

describe("RepositoryCollectionVersionsTab", () => {
  it(
    "uploads a collection version, tracks the async task, and shows the completion in the drawer - " +
      "VERIFIED live: 202 + task, one-step (file+repository) unlike role upload",
    async () => {
      renderApp(<RepositoryCollectionVersionsTab repository={ANSIBLE_REPO_FIXTURE} />, {
        withTasksDrawer: true,
      });

      expect(
        await screen.findByText(COLLECTION_VERSION_FIXTURE.name),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Upload collection" }));

      const dialog = await screen.findByRole("dialog");
      // PatternFly's FileUpload doesn't associate its hidden file input with
      // the FormGroup label via htmlFor - query the input directly.
      const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["tar-bytes"], "pulpit_test-demo2-2.0.0.tar.gz", {
        type: "application/gzip",
      });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole("button", { name: "Upload" });
      await waitFor(() => expect(uploadButton).not.toBeDisabled());
      fireEvent.click(uploadButton);

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(
        await screen.findByText(
          `Upload "pulpit_test-demo2-2.0.0.tar.gz" to "${ANSIBLE_REPO_FIXTURE.name}"`,
        ),
      ).toBeInTheDocument();
    },
  );
});
