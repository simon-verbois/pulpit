import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { DefaultSettingsPage } from "./DefaultSettingsPage";

const SETTINGS_URL = "/pulpit-core/api/v1/default_settings/settings";

const DEFAULT_SETTINGS = {
  id: "11111111-1111-1111-1111-111111111111",
  proxy_url: "",
  proxy_username: "",
  proxy_password_is_set: false,
  proxy_tls_validation: true,
  proxy_ca_cert: null as string | null,
  updated_at: "2026-01-01T00:00:00Z",
};

function mockSettings(overrides: Partial<typeof DEFAULT_SETTINGS> = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...overrides };
  server.use(
    http.get(SETTINGS_URL, () => HttpResponse.json(settings)),
    http.patch(SETTINGS_URL, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const { proxy_password, ...rest } = body;
      return HttpResponse.json({
        ...settings,
        ...rest,
        proxy_password_is_set:
          proxy_password === undefined
            ? settings.proxy_password_is_set
            : proxy_password !== "",
      });
    }),
  );
}

describe("DefaultSettingsPage", () => {
  it("loads and shows the current proxy URL", async () => {
    mockSettings({ proxy_url: "http://proxy.example.com:3128" });

    renderApp(<DefaultSettingsPage />);

    expect(await screen.findByLabelText("Proxy URL")).toHaveValue(
      "http://proxy.example.com:3128",
    );
  });

  it("shows a normalized error state when settings fail to load", async () => {
    server.use(http.get(SETTINGS_URL, () => new HttpResponse(null, { status: 502 })));

    renderApp(<DefaultSettingsPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("never pre-fills the proxy password field, even when one is set", async () => {
    mockSettings({ proxy_password_is_set: true });

    renderApp(<DefaultSettingsPage />);

    expect(await screen.findByLabelText("Proxy password")).toHaveValue("");
    expect(
      screen.getByText(/Currently set - leave blank to keep it/i),
    ).toBeInTheDocument();
  });

  it("saves the proxy URL via PATCH", async () => {
    mockSettings();

    renderApp(<DefaultSettingsPage />);

    const urlInput = await screen.findByLabelText("Proxy URL");
    fireEvent.change(urlInput, { target: { value: "http://proxy:3128" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(urlInput).toHaveValue("http://proxy:3128"));
  });

  it("setting a password updates the hint after saving", async () => {
    mockSettings();

    renderApp(<DefaultSettingsPage />);

    const passwordInput = await screen.findByLabelText("Proxy password");
    fireEvent.change(passwordInput, { target: { value: "s3cret" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(/Currently set - leave blank to keep it/i),
    ).toBeInTheDocument();
  });

  it("unchecked by default, and saves proxy_tls_validation: false when checked", async () => {
    let lastPatchBody: Record<string, unknown> = {};
    mockSettings();
    server.use(
      http.patch(SETTINGS_URL, async ({ request }) => {
        lastPatchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...DEFAULT_SETTINGS, ...lastPatchBody });
      }),
    );

    renderApp(<DefaultSettingsPage />);

    const skipTls = await screen.findByLabelText("Skip TLS certificate validation");
    expect(skipTls).not.toBeChecked();

    fireEvent.click(skipTls);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(lastPatchBody.proxy_tls_validation).toBe(false));
  });

  it("shows checked when the stored default already skips TLS validation", async () => {
    mockSettings({ proxy_tls_validation: false });

    renderApp(<DefaultSettingsPage />);

    expect(await screen.findByLabelText("Skip TLS certificate validation")).toBeChecked();
  });

  it("disables Save until a field actually changes, and re-disables it after saving", async () => {
    mockSettings();

    renderApp(<DefaultSettingsPage />);

    const saveButton = await screen.findByRole("button", { name: "Save" });
    await waitFor(() => expect(saveButton).toBeDisabled());

    const urlInput = screen.getByLabelText("Proxy URL");
    fireEvent.change(urlInput, { target: { value: "http://proxy:3128" } });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => expect(saveButton).toBeDisabled());
  });

  it("loads the current default CA certificate", async () => {
    const CA_CERT =
      "-----BEGIN CERTIFICATE-----\nMIIC...fake...==\n-----END CERTIFICATE-----";
    mockSettings({ proxy_ca_cert: CA_CERT });

    renderApp(<DefaultSettingsPage />);

    expect(await screen.findByLabelText("Trusted CA certificate (PEM)")).toHaveValue(
      CA_CERT,
    );
  });

  it("saves the CA certificate via PATCH", async () => {
    const CA_CERT =
      "-----BEGIN CERTIFICATE-----\nMIIC...fake...==\n-----END CERTIFICATE-----";
    let lastPatchBody: Record<string, unknown> = {};
    mockSettings();
    server.use(
      http.patch(SETTINGS_URL, async ({ request }) => {
        lastPatchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...DEFAULT_SETTINGS, ...lastPatchBody });
      }),
    );

    renderApp(<DefaultSettingsPage />);

    const caCertField = await screen.findByLabelText("Trusted CA certificate (PEM)");
    fireEvent.change(caCertField, { target: { value: CA_CERT } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(lastPatchBody.proxy_ca_cert).toBe(CA_CERT));
  });

  it("disables Apply to all remotes while there are unsaved changes", async () => {
    mockSettings();

    renderApp(<DefaultSettingsPage />);

    const applyButton = await screen.findByRole("button", {
      name: "Apply to all remotes…",
    });
    expect(applyButton).toBeEnabled();

    fireEvent.change(await screen.findByLabelText("Proxy URL"), {
      target: { value: "http://proxy:3128" },
    });
    expect(applyButton).toBeDisabled();
  });

  it("applies the saved proxy to every remote after confirmation", async () => {
    mockSettings();
    server.use(
      http.post("/pulpit-core/api/v1/default_settings/apply-proxy-to-all-remotes", () =>
        HttpResponse.json(
          {
            id: "22222222-2222-2222-2222-222222222222",
            job_type: "default_settings.apply_proxy_to_all_remotes",
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
      http.get("/pulpit-core/api/v1/jobs/22222222-2222-2222-2222-222222222222", () =>
        HttpResponse.json({
          id: "22222222-2222-2222-2222-222222222222",
          job_type: "default_settings.apply_proxy_to_all_remotes",
          status: "success",
          result: { updated_count: 3, updated: ["a", "b", "c"], failed: [] },
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

    renderApp(<DefaultSettingsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Apply to all remotes…" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply to all remotes" }));

    expect(await within(dialog).findByText("Updated 3 remotes")).toBeInTheDocument();
  });
});
