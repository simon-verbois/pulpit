import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

import { renderApp } from "../../../test/renderApp";
import { RPM_ADVISORY_FIXTURE, RPM_REPO_FIXTURE } from "../../../test/handlers";
import { RepositoryAdvisoriesTab } from "./RepositoryAdvisoriesTab";

describe("RepositoryAdvisoriesTab", () => {
  it("renders the repository's advisories", async () => {
    renderApp(<RepositoryAdvisoriesTab repository={RPM_REPO_FIXTURE} />);

    expect(await screen.findByText(RPM_ADVISORY_FIXTURE.id)).toBeInTheDocument();
  });

  it(
    "uploads an advisory (one step - VERIFIED live: the repository field is " +
      "accepted directly, no separate modify call, unlike packages) and tracks the task",
    async () => {
      renderApp(<RepositoryAdvisoriesTab repository={RPM_REPO_FIXTURE} />, {
        withTasksDrawer: true,
      });

      await screen.findByText(RPM_ADVISORY_FIXTURE.id);
      fireEvent.click(screen.getByRole("button", { name: "Upload advisory" }));

      const dialog = await screen.findByRole("dialog");
      const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["{}"], "advisory.json", { type: "application/json" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByRole("button", { name: "Upload" });
      await waitFor(() => expect(uploadButton).not.toBeDisabled());
      fireEvent.click(uploadButton);

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(
        await screen.findByText(`Add "advisory.json" to "${RPM_REPO_FIXTURE.name}"`),
      ).toBeInTheDocument();
    },
  );
});
