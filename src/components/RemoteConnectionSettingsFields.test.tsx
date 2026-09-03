import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../test/mswServer";
import { renderApp } from "../test/renderApp";
import {
  RemoteConnectionSettingsFields,
  type HiddenRemoteField,
  type RemoteConnectionSettings,
} from "./RemoteConnectionSettingsFields";

const SETTINGS_URL = "/pulpit-core/api/v1/default_settings/settings";
const CREDENTIALS_URL = "/pulpit-core/api/v1/default_settings/proxy-credentials";

function mockInstanceDefaultProxy({
  proxyTlsValidation = true,
}: { proxyTlsValidation?: boolean } = {}) {
  server.use(
    http.get(SETTINGS_URL, () =>
      HttpResponse.json({
        id: "11111111-1111-1111-1111-111111111111",
        proxy_url: "http://default-proxy.example.com:3128",
        proxy_username: "default-user",
        proxy_password_is_set: true,
        proxy_tls_validation: proxyTlsValidation,
        updated_at: "2026-01-01T00:00:00Z",
      }),
    ),
    http.get(CREDENTIALS_URL, () =>
      HttpResponse.json({
        proxy_url: "http://default-proxy.example.com:3128",
        proxy_username: "default-user",
        proxy_password: "default-pass",
      }),
    ),
  );
}

function Harness({ hiddenFields }: { hiddenFields?: HiddenRemoteField[] }) {
  const [value, setValue] = useState<RemoteConnectionSettings>({});
  return (
    <>
      <RemoteConnectionSettingsFields
        idPrefix="test"
        value={value}
        onChange={setValue}
        hiddenFields={hiddenFields}
      />
      <div data-testid="captured">{JSON.stringify(value)}</div>
    </>
  );
}

describe("RemoteConnectionSettingsFields", () => {
  it("shows no default-proxy toggle when none is configured", async () => {
    renderApp(<Harness />);

    fireEvent.click(await screen.findByText("Advanced connection settings"));

    expect(
      screen.queryByLabelText("Use the instance default proxy"),
    ).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Proxy URL")).toBeInTheDocument();
  });

  it("auto-applies the instance default proxy for a new remote (Create)", async () => {
    mockInstanceDefaultProxy();

    renderApp(<Harness />);

    const checkbox = await screen.findByLabelText("Use the instance default proxy");
    expect(checkbox).toBeChecked();
    // The section auto-expands and the manual fields stay hidden while the
    // default is in effect.
    expect(screen.queryByLabelText("Proxy URL")).not.toBeInTheDocument();

    await waitFor(() => {
      const captured = JSON.parse(
        screen.getByTestId("captured").textContent ?? "{}",
      ) as RemoteConnectionSettings;
      expect(captured.proxy_url).toBe("http://default-proxy.example.com:3128");
      expect(captured.proxy_username).toBe("default-user");
      expect(captured.proxy_password).toBe("default-pass");
    });
  });

  it("defaults to manual/override when editing an existing remote", async () => {
    mockInstanceDefaultProxy();

    renderApp(<Harness hiddenFields={[]} />);

    const checkbox = await screen.findByLabelText("Use the instance default proxy");
    expect(checkbox).not.toBeChecked();
    expect(await screen.findByLabelText("Proxy URL")).toBeInTheDocument();
  });

  it("unchecking the default toggle reveals editable fields pre-filled from it", async () => {
    mockInstanceDefaultProxy();

    renderApp(<Harness />);

    const checkbox = await screen.findByLabelText("Use the instance default proxy");
    await waitFor(() => expect(checkbox).toBeChecked());
    await waitFor(() => {
      const captured = JSON.parse(
        screen.getByTestId("captured").textContent ?? "{}",
      ) as RemoteConnectionSettings;
      expect(captured.proxy_url).toBe("http://default-proxy.example.com:3128");
    });

    fireEvent.click(checkbox);

    expect(await screen.findByLabelText("Proxy URL")).toHaveValue(
      "http://default-proxy.example.com:3128",
    );
  });

  it("applies the default's TLS validation preference and locks the checkbox", async () => {
    mockInstanceDefaultProxy({ proxyTlsValidation: false });

    renderApp(<Harness />);

    const tlsCheckbox = await screen.findByLabelText(
      "Validate TLS certificates (origin server and proxy)",
    );
    await waitFor(() => expect(tlsCheckbox).not.toBeChecked());
    expect(tlsCheckbox).toBeDisabled();
    expect(
      screen.getByText(/Set by the instance default proxy above/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      const captured = JSON.parse(
        screen.getByTestId("captured").textContent ?? "{}",
      ) as RemoteConnectionSettings;
      expect(captured.tls_validation).toBe(false);
    });
  });
});
