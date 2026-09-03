import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
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
});
