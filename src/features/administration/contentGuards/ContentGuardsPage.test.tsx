import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { HEADER_GUARD_FIXTURE, RBAC_GUARD_FIXTURE } from "../../../test/handlers";
import { ContentGuardsPage } from "./ContentGuardsPage";

const GENERIC_BASE = "/pulp/api/v3/contentguards/";

describe("ContentGuardsPage", () => {
  it("renders every seeded guard with its type derived from prn", async () => {
    renderApp(<ContentGuardsPage />, {
      withAdministrationHeaderAction: "content-guards",
    });

    expect(await screen.findByText(HEADER_GUARD_FIXTURE.name)).toBeInTheDocument();
    expect(screen.getByText(RBAC_GUARD_FIXTURE.name)).toBeInTheDocument();
    const headerRow = screen.getByRole("row", {
      name: new RegExp(HEADER_GUARD_FIXTURE.name),
    });
    expect(within(headerRow).getByText("Header")).toBeInTheDocument();
    const rbacRow = screen.getByRole("row", {
      name: new RegExp(RBAC_GUARD_FIXTURE.name),
    });
    expect(within(rbacRow).getByText("RBAC")).toBeInTheDocument();
    // Only RBAC guards get the "Access" action - reuses ObjectAccessTab.
    expect(within(rbacRow).getByRole("button", { name: "Access" })).toBeInTheDocument();
    expect(
      within(headerRow).queryByRole("button", { name: "Access" }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no content guards", async () => {
    server.use(
      http.get(GENERIC_BASE, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<ContentGuardsPage />, {
      withAdministrationHeaderAction: "content-guards",
    });

    expect(await screen.findByText("No content guards yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(http.get(GENERIC_BASE, () => new HttpResponse(null, { status: 502 })));

    renderApp(<ContentGuardsPage />, {
      withAdministrationHeaderAction: "content-guards",
    });

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("creates a header content guard", async () => {
    renderApp(<ContentGuardsPage />, {
      withAdministrationHeaderAction: "content-guards",
    });

    await screen.findByText(HEADER_GUARD_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Create content guard" }));

    const dialog = await screen.findByRole("dialog");
    // "Name" is a substring of "Header name" - match the start of the label
    // to avoid an ambiguous multi-match.
    fireEvent.change(within(dialog).getByLabelText(/^Name\b/), {
      target: { value: "brand-new-header-guard" },
    });
    fireEvent.change(within(dialog).getByLabelText("Header name", { exact: false }), {
      target: { value: "X-Custom" },
    });
    fireEvent.change(within(dialog).getByLabelText("Header value", { exact: false }), {
      target: { value: "abc" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("brand-new-header-guard")).toBeInTheDocument();
  });

  it("creates an RBAC content guard with no extra fields required", async () => {
    renderApp(<ContentGuardsPage />, {
      withAdministrationHeaderAction: "content-guards",
    });

    await screen.findByText(HEADER_GUARD_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Create content guard" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Type", { exact: false }), {
      target: { value: "rbac" },
    });
    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "brand-new-rbac-guard" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("brand-new-rbac-guard")).toBeInTheDocument();
  });

  it("creates an X.509 certificate guard requiring a CA certificate", async () => {
    renderApp(<ContentGuardsPage />, {
      withAdministrationHeaderAction: "content-guards",
    });

    await screen.findByText(HEADER_GUARD_FIXTURE.name);
    fireEvent.click(screen.getByRole("button", { name: "Create content guard" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Type", { exact: false }), {
      target: { value: "x509" },
    });
    fireEvent.change(within(dialog).getByLabelText("Name", { exact: false }), {
      target: { value: "brand-new-x509-guard" },
    });
    const submitButton = within(dialog).getByRole("button", { name: "Create" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("CA certificate", { exact: false }), {
      target: { value: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----" },
    });
    expect(submitButton).not.toBeDisabled();
    fireEvent.click(submitButton);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("brand-new-x509-guard")).toBeInTheDocument();
  });

  it("edits a header guard's value", async () => {
    renderApp(<ContentGuardsPage />, {
      withAdministrationHeaderAction: "content-guards",
    });

    await screen.findByText(HEADER_GUARD_FIXTURE.name);
    const headerRow = screen.getByRole("row", {
      name: new RegExp(HEADER_GUARD_FIXTURE.name),
    });
    fireEvent.click(within(headerRow).getByRole("button", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByLabelText("Header value", { exact: false });
    fireEvent.change(within(dialog).getByLabelText("Header value", { exact: false }), {
      target: { value: "rotated-secret" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("manages access on an RBAC guard by reusing the shared ObjectAccessTab", async () => {
    renderApp(<ContentGuardsPage />, {
      withAdministrationHeaderAction: "content-guards",
    });

    await screen.findByText(RBAC_GUARD_FIXTURE.name);
    const rbacRow = screen.getByRole("row", {
      name: new RegExp(RBAC_GUARD_FIXTURE.name),
    });
    fireEvent.click(within(rbacRow).getByRole("button", { name: "Access" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByRole("button", { name: "Grant access…" }),
    ).toBeInTheDocument();
  });

  it("deletes a content guard after confirmation", async () => {
    renderApp(<ContentGuardsPage />, {
      withAdministrationHeaderAction: "content-guards",
    });

    await screen.findByText(HEADER_GUARD_FIXTURE.name);
    const headerRow = screen.getByRole("row", {
      name: new RegExp(HEADER_GUARD_FIXTURE.name),
    });
    fireEvent.click(within(headerRow).getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.queryByText(HEADER_GUARD_FIXTURE.name)).not.toBeInTheDocument(),
    );
  });
});
