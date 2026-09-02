import { describe, expect, it } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { SigningPage } from "./SigningPage";

const BASE = "/pulp/api/v3/signing-services/";
const FIXTURE = {
  pulp_href: `${BASE}sig-1/`,
  name: "test-signing-service",
  public_key:
    "-----BEGIN PGP PUBLIC KEY BLOCK-----\nkey-data\n-----END PGP PUBLIC KEY BLOCK-----",
  pubkey_fingerprint: "ABCD1234EF",
  script: "/var/lib/pulp/scripts/sign.sh",
};

describe("SigningPage", () => {
  it("shows an empty state when there are no signing services (VERIFIED live: none on this dev instance)", async () => {
    renderApp(<SigningPage />);

    expect(await screen.findByText("No signing services configured")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(http.get(BASE, () => new HttpResponse(null, { status: 502 })));

    renderApp(<SigningPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("renders a signing service with a View action showing its public key and script", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({ count: 1, next: null, previous: null, results: [FIXTURE] }),
      ),
    );

    renderApp(<SigningPage />);

    expect(await screen.findByText(FIXTURE.name)).toBeInTheDocument();
    expect(screen.getByText(FIXTURE.pubkey_fingerprint)).toBeInTheDocument();
    // No create/edit/delete anywhere - read-only (VERIFIED live: no write endpoints exist).
    expect(screen.queryByRole("button", { name: /create/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View" }));
    const dialog = await screen.findByRole("dialog");
    // ClipboardCopy's expansion variant renders its content as a textbox's
    // value, not as plain text content (VERIFIED - same pattern already
    // established for other ClipboardCopy usages in this app).
    const textboxes = within(dialog).getAllByRole("textbox");
    const values = textboxes.map((box) => (box as HTMLTextAreaElement).value);
    expect(values.some((v) => v.includes("key-data"))).toBe(true);
    expect(values.some((v) => v.includes("/var/lib/pulp/scripts/sign.sh"))).toBe(true);
  });
});
