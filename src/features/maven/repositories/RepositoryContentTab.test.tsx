import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

import { renderApp } from "../../../test/renderApp";
import { MAVEN_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoryContentTab } from "./RepositoryContentTab";

describe("RepositoryContentTab", () => {
  it("uploads an artifact with a relative path, tracks the (one-shot, async) task, and shows completion in the drawer", async () => {
    renderApp(<RepositoryContentTab repository={MAVEN_REPO_FIXTURE} />, {
      withTasksDrawer: true,
    });

    expect(
      await screen.findByText("No artifacts in this repository yet"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Upload artifact" }));

    const dialog = await screen.findByRole("dialog");
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["jar-bytes"], "my-lib-1.0.jar", {
      type: "application/java-archive",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const relativePathField = dialog.querySelector(
      "#content-relative-path",
    ) as HTMLInputElement;
    // FileUpload commits the selected file to state asynchronously - wait for
    // it to auto-fill the relative path with the filename before overriding
    // it, otherwise this change can land before that default is set and get
    // silently clobbered by it.
    await waitFor(() => expect(relativePathField).toHaveValue("my-lib-1.0.jar"));
    fireEvent.change(relativePathField, {
      target: { value: "com/example/my-lib/1.0/my-lib-1.0.jar" },
    });

    const uploadButton = screen.getByRole("button", { name: "Upload" });
    await waitFor(() => expect(uploadButton).not.toBeDisabled());
    fireEvent.click(uploadButton);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(
        `Add "com/example/my-lib/1.0/my-lib-1.0.jar" to "${MAVEN_REPO_FIXTURE.name}"`,
      ),
    ).toBeInTheDocument();
  });
});
