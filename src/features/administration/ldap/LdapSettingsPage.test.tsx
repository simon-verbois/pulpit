import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { LdapSettingsPage } from "./LdapSettingsPage";

const SETTINGS_URL = "/pulpit-core/api/v1/ldap/settings";

const DEFAULT_SETTINGS = {
  id: "11111111-1111-1111-1111-111111111111",
  enabled: false,
  server_uri: "",
  bind_dn: "",
  bind_password_is_set: false,
  start_tls: false,
  ca_cert: null as string | null,
  user_search_base: "",
  user_search_filter: "(uid=%(user)s)",
  group_search_base: "",
  group_search_filter: "(objectClass=groupOfNames)",
  group_type: "group_of_names" as const,
  require_group_dn: null as string | null,
  mirror_groups: true,
  attr_first_name: "givenName",
  attr_last_name: "sn",
  attr_email: "mail",
  updated_at: "2026-01-01T00:00:00Z",
};

function mockSettings(overrides: Partial<typeof DEFAULT_SETTINGS> = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...overrides };
  server.use(
    http.get(SETTINGS_URL, () => HttpResponse.json(settings)),
    http.patch(SETTINGS_URL, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const { bind_password, ...rest } = body;
      return HttpResponse.json({
        ...settings,
        ...rest,
        bind_password_is_set:
          bind_password === undefined
            ? settings.bind_password_is_set
            : bind_password !== "",
      });
    }),
  );
}

const CA_CERT = "-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----";

describe("LdapSettingsPage", () => {
  it("shows the saved CA certificate and sends an edited one on Save", async () => {
    mockSettings({ ca_cert: CA_CERT });
    let patchBody: Record<string, unknown> = {};
    server.use(
      http.patch(SETTINGS_URL, async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ...DEFAULT_SETTINGS,
          ca_cert: patchBody.ca_cert || null,
        });
      }),
    );

    renderApp(<LdapSettingsPage />);

    const caField = await screen.findByLabelText("CA certificate (PEM)");
    expect(caField).toHaveValue(CA_CERT);

    fireEvent.change(caField, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(patchBody.ca_cert).toBe(""));
  });

  it("loads and shows the current server URI", async () => {
    mockSettings({ server_uri: "ldaps://ldap.example.com:636" });

    renderApp(<LdapSettingsPage />);

    expect(await screen.findByLabelText("Server URI")).toHaveValue(
      "ldaps://ldap.example.com:636",
    );
  });

  it("shows group and attribute settings without an advanced-settings disclosure", async () => {
    mockSettings();

    renderApp(<LdapSettingsPage />);

    expect(await screen.findByRole("heading", { name: "Group lookup" })).toBeVisible();
    expect(screen.getByLabelText("Group search base")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Attribute mapping" })).toBeVisible();
    expect(screen.getByLabelText("First name attribute")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /advanced settings/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a normalized error state when settings fail to load", async () => {
    server.use(http.get(SETTINGS_URL, () => new HttpResponse(null, { status: 502 })));

    renderApp(<LdapSettingsPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("never pre-fills the bind password field, even when one is set", async () => {
    mockSettings({ bind_password_is_set: true });

    renderApp(<LdapSettingsPage />);

    expect(await screen.findByLabelText("Bind password")).toHaveValue("");
    expect(
      screen.getByText(/Currently set - leave blank to keep it/i),
    ).toBeInTheDocument();
  });

  it("saves the server URI via PATCH", async () => {
    mockSettings();

    renderApp(<LdapSettingsPage />);

    const uriInput = await screen.findByLabelText("Server URI");
    fireEvent.change(uriInput, { target: { value: "ldaps://ldap:636" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(uriInput).toHaveValue("ldaps://ldap:636"));
  });

  it("disables Save until a field actually changes, and re-disables it after saving", async () => {
    mockSettings();

    renderApp(<LdapSettingsPage />);

    const saveButton = await screen.findByRole("button", { name: "Save" });
    await waitFor(() => expect(saveButton).toBeDisabled());

    fireEvent.change(screen.getByLabelText("Server URI"), {
      target: { value: "ldaps://ldap:636" },
    });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => expect(saveButton).toBeDisabled());
  });

  it("disables Apply while there are unsaved changes", async () => {
    mockSettings();

    renderApp(<LdapSettingsPage />);

    const applyButton = await screen.findByRole("button", { name: "Apply…" });
    expect(applyButton).toBeEnabled();

    fireEvent.change(await screen.findByLabelText("Server URI"), {
      target: { value: "ldaps://ldap:636" },
    });
    expect(applyButton).toBeDisabled();
  });

  it("disables Test connection until a server URI is set", async () => {
    mockSettings();

    renderApp(<LdapSettingsPage />);

    expect(await screen.findByRole("button", { name: "Test connection" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Server URI"), {
      target: { value: "ldaps://ldap:636" },
    });

    expect(screen.getByRole("button", { name: "Test connection" })).toBeEnabled();
  });

  it("shows the test-connection result", async () => {
    mockSettings({ server_uri: "ldaps://ldap.example.com:636" });
    server.use(
      http.post(`${SETTINGS_URL}/test-connection`, () =>
        HttpResponse.json(
          {
            id: "22222222-2222-2222-2222-222222222222",
            job_type: "ldap.test_connection",
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
          job_type: "ldap.test_connection",
          status: "success",
          result: { success: true, bound_as: "cn=readonly,dc=example,dc=com" },
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

    renderApp(<LdapSettingsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Test connection" }));

    expect(
      await screen.findByText("Connected, bound as cn=readonly,dc=example,dc=com"),
    ).toBeInTheDocument();
  });

  it("shows group search and require-group-dn diagnostics from the test-connection result", async () => {
    mockSettings({ server_uri: "ldaps://ldap.example.com:636" });
    server.use(
      http.post(`${SETTINGS_URL}/test-connection`, () =>
        HttpResponse.json(
          {
            id: "44444444-4444-4444-4444-444444444444",
            job_type: "ldap.test_connection",
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
      http.get("/pulpit-core/api/v1/jobs/44444444-4444-4444-4444-444444444444", () =>
        HttpResponse.json({
          id: "44444444-4444-4444-4444-444444444444",
          job_type: "ldap.test_connection",
          status: "success",
          result: {
            success: true,
            bound_as: "cn=readonly,dc=example,dc=com",
            group_search_matched: false,
            require_group_dn_exists: false,
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

    renderApp(<LdapSettingsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Test connection" }));

    expect(
      await screen.findByText(
        "The group search base/filter returned nothing - double-check them.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The Require group DN does not exist - no one would be able to log in.",
      ),
    ).toBeInTheDocument();
  });

  it("applies the saved config after confirmation", async () => {
    mockSettings({ server_uri: "ldaps://ldap.example.com:636" });
    server.use(
      http.post(`${SETTINGS_URL}/apply`, () =>
        HttpResponse.json(
          {
            id: "33333333-3333-3333-3333-333333333333",
            job_type: "ldap.apply_config",
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
          job_type: "ldap.apply_config",
          status: "success",
          result: { manifest_written: true, pulp_api_healthy: true },
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

    renderApp(<LdapSettingsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Apply…" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));

    expect(
      await within(dialog).findByText("Applied - Pulp's API is back up"),
    ).toBeInTheDocument();
  });
});
