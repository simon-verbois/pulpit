import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { RepositorySigningPage } from "./RepositorySigningPage";

const SETTINGS_URL = "/pulpit-core/api/v1/signing/settings";
const KEYS_URL = "/pulpit-core/api/v1/signing/keys";

const DEFAULT_SETTINGS = {
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
};

const ACTIVE_KEY = {
  id: "22222222-2222-2222-2222-222222222222",
  state: "active",
  key_id: "ABCD1234EF567890",
  fingerprint: "ABCD1234EF567890ABCD1234EF567890ABCD1234",
  identity_name: "Pulp Repository Signing Key",
  identity_email: "",
  algorithm: "rsa4096",
  generated_by: "local-gpg",
  created_at: "2026-01-01T00:00:00Z",
  activated_at: "2026-01-01T00:00:00Z",
  expires_at: "2028-01-01T00:00:00Z",
  retiring_at: null,
  retired_at: null,
  public_key_url: "/keys/RPM-GPG-KEY-pulp",
};

function mockSettings(overrides: Partial<typeof DEFAULT_SETTINGS> = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...overrides };
  server.use(
    http.get(SETTINGS_URL, () => HttpResponse.json(settings)),
    http.patch(SETTINGS_URL, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ ...settings, ...body });
    }),
  );
}

function mockKeys(keys: unknown[]) {
  server.use(http.get(KEYS_URL, () => HttpResponse.json(keys)));
}

function mockPulpServices(keyId: string, services: unknown[]) {
  server.use(
    http.get(`/pulpit-core/api/v1/signing/keys/${keyId}/pulp-services`, () =>
      HttpResponse.json(services),
    ),
  );
}

describe("RepositorySigningPage", () => {
  it("shows an empty key state when no keys exist", async () => {
    mockSettings();
    mockKeys([]);

    renderApp(<RepositorySigningPage />);

    expect(await screen.findByText("No signing key generated yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when settings fail to load", async () => {
    server.use(http.get(SETTINGS_URL, () => new HttpResponse(null, { status: 502 })));
    mockKeys([]);

    renderApp(<RepositorySigningPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("renders the active key with its fingerprint, expiry, and public key URL", async () => {
    mockSettings();
    mockKeys([ACTIVE_KEY]);
    mockPulpServices(ACTIVE_KEY.id, []);

    renderApp(<RepositorySigningPage />);

    expect((await screen.findAllByText("ACTIVE")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(ACTIVE_KEY.fingerprint).length).toBeGreaterThan(0);
    expect(
      await screen.findByText(`${window.location.origin}/keys/RPM-GPG-KEY-pulp`),
    ).toBeInTheDocument();
  });

  it("shows the manual Pulp registration command while a service is pending", async () => {
    mockSettings({ package_signing_enabled: true });
    mockKeys([ACTIVE_KEY]);
    mockPulpServices(ACTIVE_KEY.id, [
      {
        purpose: "package",
        status: "pending_manual_setup",
        name: "Pulp RPM Signing Service",
        pulp_href: null,
        bootstrap_command:
          "pulpcore-manager add-signing-service 'Pulp RPM Signing Service' /var/lib/pulpit-signing/scripts/sign_rpm_package.sh ABCD1234EF567890ABCD1234EF567890ABCD1234 --class rpm:RpmPackageSigningService",
      },
    ]);

    renderApp(<RepositorySigningPage />);

    expect(
      await screen.findByText(
        /Waiting on a one-time manual step to finish publishing this key/i,
      ),
    ).toBeInTheDocument();
    const textboxes = screen.getAllByRole("textbox");
    expect(
      textboxes.some((box) =>
        (box as HTMLTextAreaElement).value.includes("add-signing-service"),
      ),
    ).toBe(true);
  });

  it("saves a settings change via PATCH when a checkbox is toggled", async () => {
    mockSettings();
    mockKeys([]);

    renderApp(<RepositorySigningPage />);

    const checkbox = await screen.findByLabelText("Signing enabled");
    fireEvent.click(checkbox);

    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it("opens a details modal with the full key info when Inspect is clicked", async () => {
    mockSettings();
    mockKeys([ACTIVE_KEY]);
    mockPulpServices(ACTIVE_KEY.id, []);

    renderApp(<RepositorySigningPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Inspect key" }));

    const dialog = await screen.findByRole("dialog", { name: "Signing key details" });
    expect(within(dialog).getByText(ACTIVE_KEY.key_id)).toBeInTheDocument();
    expect(within(dialog).getByText("local-gpg")).toBeInTheDocument();
  });

  it("shows new key defaults and automatic rotation fields in the Generate key dialog", async () => {
    mockSettings();
    mockKeys([]);

    renderApp(<RepositorySigningPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Generate key" }));

    const dialog = await screen.findByRole("dialog", { name: "Generate signing key" });
    expect(await within(dialog).findByLabelText("Key name")).toHaveValue(
      "Pulp Repository Signing Key",
    );
    expect(
      within(dialog).getByLabelText("Automatic key rotation enabled"),
    ).toBeInTheDocument();
  });

  it("never shows a create/edit control for private key material anywhere on the page", async () => {
    mockSettings();
    mockKeys([ACTIVE_KEY]);
    mockPulpServices(ACTIVE_KEY.id, []);

    renderApp(<RepositorySigningPage />);
    await screen.findAllByText("ACTIVE");

    expect(screen.queryByText(/private key/i)).not.toBeInTheDocument();
    expect(document.body.textContent?.toLowerCase()).not.toContain(
      "begin pgp private key",
    );
  });
});
