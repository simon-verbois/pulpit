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

  it("keeps a text field's own typed value even while its own save PATCH is still in flight", async () => {
    // Regression test: this field's `value` used to be bound straight to
    // the settings query, saved on every change - typing a second character
    // before the first PATCH resolved reverted the field to its pre-edit
    // value (VERIFIED live: the query hadn't been updated yet, so React
    // forced the DOM input back, moving the cursor to the end). A delayed
    // PATCH response here reproduces exactly that race.
    mockSettings();
    mockKeys([]);
    let resolvePatch: (() => void) | undefined;
    server.use(
      http.patch(SETTINGS_URL, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        await new Promise<void>((resolve) => {
          resolvePatch = resolve;
        });
        return HttpResponse.json({ ...DEFAULT_SETTINGS, ...body });
      }),
    );

    renderApp(<RepositorySigningPage />);

    const filenameInput = await screen.findByLabelText("Filename");
    fireEvent.change(filenameInput, { target: { value: "custom-1" } });
    // The first PATCH is now stuck awaiting resolvePatch - typing again
    // before it resolves must not revert the field.
    fireEvent.change(filenameInput, { target: { value: "custom-12" } });
    expect(filenameInput).toHaveValue("custom-12");

    resolvePatch?.();
    await waitFor(() => expect(filenameInput).toHaveValue("custom-12"));
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

  it("shows new key defaults and automatic rotation fields in the Generate key dialog, not the General section", async () => {
    mockSettings();
    mockKeys([]);

    renderApp(<RepositorySigningPage />);

    await screen.findByLabelText("Signing enabled");
    expect(screen.queryByLabelText("Key name")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Automatic key rotation enabled"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generate key" }));

    const dialog = await screen.findByRole("dialog", { name: "Generate signing key" });
    expect(
      within(dialog).getByLabelText("Validity", { exact: false }),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Key name")).toHaveValue(
      "Pulp Repository Signing Key",
    );
    expect(
      within(dialog).getByLabelText("Automatic key rotation enabled"),
    ).toBeInTheDocument();
  });

  it("signs every existing repository after confirmation", async () => {
    mockSettings();
    mockKeys([]);
    server.use(
      http.post("/pulpit-core/api/v1/signing/repositories/apply-to-all", () =>
        HttpResponse.json(
          {
            id: "33333333-3333-3333-3333-333333333333",
            job_type: "signing.apply_signing_to_all_repositories",
            status: "queued",
            result: null,
            error: null,
            attempts: 0,
            scheduled_at: "2026-01-01T00:00:00Z",
            started_at: null,
            finished_at: null,
            requested_by: "admin",
            created_at: "2026-01-01T00:00:00Z",
          },
          { status: 202 },
        ),
      ),
      http.get("/pulpit-core/api/v1/jobs/33333333-3333-3333-3333-333333333333", () =>
        HttpResponse.json({
          id: "33333333-3333-3333-3333-333333333333",
          job_type: "signing.apply_signing_to_all_repositories",
          status: "success",
          result: {
            updated_count: 2,
            updated: [],
            resigning_count: 1,
            republishing_count: 1,
            failed: [],
          },
          error: null,
          attempts: 1,
          scheduled_at: "2026-01-01T00:00:00Z",
          started_at: "2026-01-01T00:00:00Z",
          finished_at: "2026-01-01T00:00:01Z",
          requested_by: "admin",
          created_at: "2026-01-01T00:00:00Z",
        }),
      ),
    );

    renderApp(<RepositorySigningPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Sign all repositories…" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Sign every existing repository?",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Sign all repositories" }),
    );

    expect(await within(dialog).findByText("Updated 2 repositories")).toBeInTheDocument();
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
