import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { TlsPage } from "./TlsPage";

const ACTIVE_URL = "/pulpit-core/api/v1/tls/active";
const HISTORY_URL = "/pulpit-core/api/v1/tls/history";
const REGENERATE_URL = "/pulpit-core/api/v1/tls/selfsigned/regenerate";
const MANUAL_URL = "/pulpit-core/api/v1/tls/manual";
const FREEIPA_SETTINGS_URL = "/pulpit-core/api/v1/tls/freeipa/settings";
const FREEIPA_WIZARD_URL = "/pulpit-core/api/v1/tls/freeipa/wizard/setup";

const ACTIVE_CERT = {
  id: "11111111-1111-1111-1111-111111111111",
  source: "self_signed",
  subject: "pulpit.local",
  fingerprint_sha256: "ab".repeat(32),
  not_before: "2026-01-01T00:00:00Z",
  not_after: "2028-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  freeipa_principal: null,
  days_until_expiry: 365,
  warn_days: 30,
  is_expiring_soon: false,
};

const FREEIPA_SETTINGS = {
  id: "44444444-4444-4444-4444-444444444444",
  enabled: false,
  base_url: "",
  verify_tls: true,
  common_name: "",
  service_principal: "",
  service_username: "",
  service_password_is_set: false,
  ca: "ipa",
  profile: null,
  auto_renew_enabled: true,
  renew_before_days: 30,
  updated_at: "2026-01-01T00:00:00Z",
};

function mockActive(overrides: Partial<typeof ACTIVE_CERT> = {}) {
  server.use(http.get(ACTIVE_URL, () => HttpResponse.json({ ...ACTIVE_CERT, ...overrides })));
}

function mockHistory(entries: unknown[]) {
  server.use(http.get(HISTORY_URL, () => HttpResponse.json(entries)));
}

function mockFreeIpaSettings(overrides: Partial<typeof FREEIPA_SETTINGS> = {}) {
  server.use(
    http.get(FREEIPA_SETTINGS_URL, () => HttpResponse.json({ ...FREEIPA_SETTINGS, ...overrides })),
    http.patch(FREEIPA_SETTINGS_URL, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ ...FREEIPA_SETTINGS, ...overrides, ...body, service_password_is_set: true });
    }),
  );
}

/** A stateful harness so tests can click between sub-tabs, since TlsPage
 * itself is a controlled component (AdministrationPage owns the state in
 * real usage). */
function TlsPageHarness({ initialSubTab = "overview" }: { initialSubTab?: string }) {
  const [subTab, setSubTab] = useState(initialSubTab);
  return <TlsPage activeSubTab={subTab} onSelectSubTab={setSubTab} />;
}

describe("TlsPage overview", () => {
  it("renders the active certificate's source, subject, and fingerprint", async () => {
    mockActive();
    mockHistory([]);

    renderApp(<TlsPageHarness />);

    expect(await screen.findByText("Self-signed")).toBeInTheDocument();
    expect(screen.getByText("pulpit.local")).toBeInTheDocument();
    expect(screen.getByText(ACTIVE_CERT.fingerprint_sha256)).toBeInTheDocument();
  });

  it("shows no expiry warning when the certificate is far from expiring", async () => {
    mockActive({ is_expiring_soon: false });
    mockHistory([]);

    renderApp(<TlsPageHarness />);

    await screen.findByText("Self-signed");
    expect(screen.queryByText(/expires in/i)).not.toBeInTheDocument();
  });

  it("shows an expiry warning when the certificate is expiring soon", async () => {
    mockActive({ is_expiring_soon: true, days_until_expiry: 5 });
    mockHistory([]);

    renderApp(<TlsPageHarness />);

    expect(await screen.findByText(/expires in 5 day\(s\)/i)).toBeInTheDocument();
  });

  it("shows a normalized error state when the active certificate fails to load", async () => {
    server.use(http.get(ACTIVE_URL, () => new HttpResponse(null, { status: 502 })));
    mockHistory([]);

    renderApp(<TlsPageHarness />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("queues a self-signed regeneration and reflects the new certificate once it lands", async () => {
    mockActive();
    mockHistory([]);
    server.use(
      http.post(REGENERATE_URL, () =>
        HttpResponse.json(
          {
            id: "22222222-2222-2222-2222-222222222222",
            job_type: "tls.generate_selfsigned",
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
    );

    renderApp(<TlsPageHarness />);
    await screen.findByText("Self-signed");

    // Once the job "completes" server-side, the active-certificate query is
    // invalidated and refetched - simulate that by swapping in a new
    // fingerprint before clicking, matching what a real regenerate does.
    mockActive({ fingerprint_sha256: "cd".repeat(32) });

    fireEvent.click(screen.getByRole("button", { name: "Regenerate self-signed certificate" }));

    await waitFor(() =>
      expect(screen.getByText("cd".repeat(32))).toBeInTheDocument(),
    );
  });

  it("shows recorded certificate history", async () => {
    mockActive();
    mockHistory([
      {
        id: "33333333-3333-3333-3333-333333333333",
        event: "installed",
        source: "self_signed",
        fingerprint_sha256: "ab".repeat(32),
        not_after: "2028-01-01T00:00:00Z",
        triggered_by: "bootstrap",
        notes: "Automatic self-signed fallback generated on first boot.",
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);

    renderApp(<TlsPageHarness />);

    expect(await screen.findByText("installed")).toBeInTheDocument();
    expect(screen.getByText("bootstrap")).toBeInTheDocument();
  });
});

describe("TlsPage manual sub-tab", () => {
  it("uploads a certificate and closes the modal on success", async () => {
    mockActive();
    mockHistory([]);
    server.use(
      http.post(MANUAL_URL, () =>
        HttpResponse.json({
          id: "55555555-5555-5555-5555-555555555555",
          source: "manual",
          subject: "CN=uploaded.example.com",
          fingerprint_sha256: "ef".repeat(32),
          not_before: "2026-01-01T00:00:00Z",
          not_after: "2027-01-01T00:00:00Z",
          created_at: "2026-01-01T00:00:00Z",
          freeipa_principal: null,
        }),
      ),
    );

    renderApp(<TlsPageHarness />);
    fireEvent.click(await screen.findByRole("tab", { name: "Manual" }));
    fireEvent.click(await screen.findByRole("button", { name: "Upload certificate" }));

    const dialog = await screen.findByRole("dialog", { name: "Upload certificate" });
    fireEvent.change(screen.getByLabelText("Certificate (PEM)", { exact: false }), {
      target: { value: "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----" },
    });
    fireEvent.change(screen.getByLabelText("Private key (PEM)", { exact: false }), {
      target: { value: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Install certificate" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Upload certificate" })).not.toBeInTheDocument(),
    );
  });

  it("shows the server's validation error inline without closing the modal", async () => {
    mockActive();
    mockHistory([]);
    server.use(
      http.post(MANUAL_URL, () =>
        HttpResponse.json({ detail: "The private key does not match the certificate." }, { status: 400 }),
      ),
    );

    renderApp(<TlsPageHarness />);
    fireEvent.click(await screen.findByRole("tab", { name: "Manual" }));
    fireEvent.click(await screen.findByRole("button", { name: "Upload certificate" }));

    fireEvent.change(screen.getByLabelText("Certificate (PEM)", { exact: false }), { target: { value: "cert" } });
    fireEvent.change(screen.getByLabelText("Private key (PEM)", { exact: false }), { target: { value: "key" } });
    fireEvent.click(screen.getByRole("button", { name: "Install certificate" }));

    expect(
      await screen.findByText("The private key does not match the certificate."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Upload certificate" })).toBeInTheDocument();
  });
});

describe("TlsPage freeipa sub-tab", () => {
  it("loads settings and saves a change", async () => {
    mockActive();
    mockHistory([]);
    mockFreeIpaSettings();

    renderApp(<TlsPageHarness />);
    fireEvent.click(await screen.findByRole("tab", { name: "FreeIPA" }));

    const baseUrlInput = await screen.findByLabelText("Base URL", { exact: false });
    fireEvent.change(baseUrlInput, { target: { value: "https://ipa.example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(baseUrlInput).toHaveValue("https://ipa.example.com"));
  });

  it("runs the guided setup and shows per-step results without leaking the admin password", async () => {
    mockActive();
    mockHistory([]);
    mockFreeIpaSettings();
    server.use(
      http.post(FREEIPA_WIZARD_URL, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body.admin_password).toBe("super-secret-admin-password");
        return HttpResponse.json({
          success: true,
          steps: [
            { step: "Authenticate as the IPA administrator", status: "created", detail: "" },
            { step: 'Create service "HTTP/pulpit.example.com@EXAMPLE.COM"', status: "created", detail: "" },
          ],
        });
      }),
    );

    renderApp(<TlsPageHarness />);
    fireEvent.click(await screen.findByRole("tab", { name: "FreeIPA" }));
    fireEvent.click(await screen.findByRole("button", { name: "Guided setup…" }));

    const dialog = await screen.findByRole("dialog", { name: "FreeIPA guided setup" });
    fireEvent.change(within(dialog).getByLabelText("FreeIPA base URL", { exact: false }), {
      target: { value: "https://ipa.example.test" },
    });
    fireEvent.change(within(dialog).getByLabelText("IPA administrator username", { exact: false }), {
      target: { value: "admin" },
    });
    fireEvent.change(within(dialog).getByLabelText("IPA administrator password", { exact: false }), {
      target: { value: "super-secret-admin-password" },
    });
    fireEvent.change(within(dialog).getByLabelText("Common name", { exact: false }), {
      target: { value: "pulpit.example.com" },
    });
    // Target service principal and the automation account username are
    // never touched here - they're expected to already be usable via their
    // auto-derived/constant defaults (Advanced settings, collapsed).
    fireEvent.click(within(dialog).getByRole("button", { name: "Run setup" }));

    expect(await within(dialog).findByText("Authenticate as the IPA administrator")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("super-secret-admin-password");
  });

  it("derives the target service principal from the common name until manually overridden", async () => {
    mockActive();
    mockHistory([]);
    mockFreeIpaSettings();

    renderApp(<TlsPageHarness />);
    fireEvent.click(await screen.findByRole("tab", { name: "FreeIPA" }));
    fireEvent.click(await screen.findByRole("button", { name: "Guided setup…" }));

    const dialog = await screen.findByRole("dialog", { name: "FreeIPA guided setup" });
    fireEvent.change(within(dialog).getByLabelText("Common name", { exact: false }), {
      target: { value: "pulpit.example.com" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Advanced settings" }));

    const principalInput = within(dialog).getByLabelText("Target service principal", { exact: false });
    expect(principalInput).toHaveValue("HTTP/pulpit.example.com@EXAMPLE.COM");

    // Changing the common name keeps re-deriving it...
    fireEvent.change(within(dialog).getByLabelText("Common name", { exact: false }), {
      target: { value: "other.example.org" },
    });
    expect(principalInput).toHaveValue("HTTP/other.example.org@EXAMPLE.ORG");

    // ...until the admin edits it directly, which then sticks even if the
    // common name changes again.
    fireEvent.change(principalInput, { target: { value: "HTTP/custom@CUSTOM.REALM" } });
    fireEvent.change(within(dialog).getByLabelText("Common name", { exact: false }), {
      target: { value: "yet-another.example.net" },
    });
    expect(principalInput).toHaveValue("HTTP/custom@CUSTOM.REALM");
  });
});
