import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../test/mswServer";
import { renderApp } from "../test/renderApp";
import { RPM_REPO_FIXTURE } from "../test/handlers";
import { SyncRepositoryModal } from "./SyncRepositoryModal";

describe("advanced synchronization choices", () => {
  it("keeps native mirror choices available with signing, explains publication and requires confirmation", async () => {
    server.use(
      http.get(RPM_REPO_FIXTURE.pulp_href, () =>
        HttpResponse.json({
          ...RPM_REPO_FIXTURE,
          package_signing_service: "/pulp/api/v3/signing-services/key/",
        }),
      ),
    );
    renderApp(
      <SyncRepositoryModal
        repositoryHref={RPM_REPO_FIXTURE.pulp_href}
        onClose={vi.fn()}
      />,
    );
    await screen.findByText(/Signing can change package checksums/);
    expect(
      screen.getByRole("option", { name: "Exact mirror, preserve upstream metadata" }),
    ).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Synchronization mode"), {
      target: { value: "mirror_complete" },
    });
    expect(screen.getByText(/even when autopublish is off/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Synchronize" })).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText("I confirm this repository should match the remote"),
    );
    expect(screen.getByRole("button", { name: "Synchronize" })).toBeEnabled();
  });
});
