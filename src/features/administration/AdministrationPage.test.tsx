import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../test/mswServer";
import { renderApp } from "../../test/renderApp";
import { AdministrationPage } from "./AdministrationPage";

const SIGNING_SETTINGS_URL = "/pulpit-core/api/v1/signing/settings";
const SIGNING_KEYS_URL = "/pulpit-core/api/v1/signing/keys";

function mockRepositorySigning() {
  server.use(
    http.get(SIGNING_SETTINGS_URL, () =>
      HttpResponse.json({
        id: "11111111-1111-1111-1111-111111111111",
        signing_enabled: false,
        package_signing_enabled: false,
        metadata_signing_enabled: false,
        key_name: "Pulp Repository Signing Key",
        identity_name: "Pulp Repository Signing Key",
        identity_email: "",
        algorithm: "rsa4096",
        validity_days: 730,
        public_key_filename: "RPM-GPG-KEY-pulp",
        rpm_signing_service_name: "Pulp RPM Signing Service",
        metadata_signing_service_name: "Pulp Metadata Signing Service",
        auto_rotation_enabled: false,
        rotation_generate_before_days: 90,
        rotation_activate_before_days: 30,
        key_retention_days: 180,
        allow_indefinite_validity: false,
        updated_at: "2026-01-01T00:00:00Z",
      }),
    ),
    http.get(SIGNING_KEYS_URL, () => HttpResponse.json([])),
  );
}

describe("AdministrationPage", () => {
  it("shows the General tab (module visibility) by default, everything checked", async () => {
    mockRepositorySigning();
    renderApp(<AdministrationPage />);

    expect(
      await screen.findByRole("heading", { name: "Administration" }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText('Show "RPM"')).toBeChecked();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves a module-visibility change via PUT", async () => {
    mockRepositorySigning();
    renderApp(<AdministrationPage />);

    const rpmCheckbox = await screen.findByLabelText('Show "RPM"');
    expect(rpmCheckbox).toBeChecked();

    fireEvent.click(rpmCheckbox);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeDisabled());
    expect(rpmCheckbox).not.toBeChecked();
  });

  it("switches between every tab, including Access's own sub-tabs", async () => {
    mockRepositorySigning();
    renderApp(<AdministrationPage />);

    await screen.findByLabelText('Show "RPM"');

    fireEvent.click(screen.getByRole("tab", { name: "Access" }));
    expect(await screen.findByRole("button", { name: "Create user" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Groups" }));
    expect(await screen.findByRole("button", { name: "Create group" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Roles" }));
    expect(await screen.findByRole("button", { name: "Create role" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Repository Signing" }));
    expect(await screen.findByLabelText("Signing enabled")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Pulp Signing Services" }));
    expect(
      await screen.findByText("No signing services configured"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Content guards" }));
    expect(await screen.findByRole("button", { name: "Create content guard" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Global Proxy Settings" }));
    expect(await screen.findByLabelText("Proxy URL")).toBeInTheDocument();
  });

  it("opens directly on a tab from the URL - survives a hard reload, unlike router state", async () => {
    mockRepositorySigning();
    renderApp(<AdministrationPage />, {
      route: "/admin?tab=repository-signing",
      path: "/admin",
    });

    expect(await screen.findByLabelText("Signing enabled")).toBeInTheDocument();
    expect(screen.queryByLabelText('Show "RPM"')).not.toBeInTheDocument();
  });

  it("opens directly on an Access sub-tab from the URL", async () => {
    mockRepositorySigning();
    renderApp(<AdministrationPage />, {
      route: "/admin?tab=access&subtab=groups",
      path: "/admin",
    });

    expect(await screen.findByRole("button", { name: "Create group" })).toBeInTheDocument();
    expect(screen.queryByLabelText('Show "RPM"')).not.toBeInTheDocument();
  });

  it("defaults to the Users sub-tab when landing on Access with no subtab in the URL", async () => {
    mockRepositorySigning();
    renderApp(<AdministrationPage />, {
      route: "/admin?tab=access",
      path: "/admin",
    });

    expect(await screen.findByRole("button", { name: "Create user" })).toBeInTheDocument();
  });
});
