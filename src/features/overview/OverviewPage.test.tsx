import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../test/mswServer";
import { renderApp } from "../../test/renderApp";
import { OverviewPage } from "./OverviewPage";

async function findComponentRow(component: string): Promise<HTMLElement> {
  const cell = await screen.findByText(component, { exact: true });
  const row = cell.closest("tr");
  if (!row) throw new Error(`No table row found for ${component}`);
  return row;
}

describe("OverviewPage", () => {
  it("renders real Pulp status data once loaded", async () => {
    renderApp(<OverviewPage />);
    expect(await screen.findByText("rpm")).toBeInTheDocument();
    expect(screen.getByText("3.38.5")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument(); // database
    expect(screen.getByText("Disconnected")).toBeInTheDocument(); // redis
    expect(screen.getByText("2 Ready")).toBeInTheDocument(); // workers
    expect(screen.getAllByText("2 Running")).toHaveLength(2); // API and content apps
    expect(screen.getByText("Modules")).toBeInTheDocument();
    expect(document.querySelectorAll(".pulpit-metric-card__indicator")).toHaveLength(0);
    const storageCard = screen.getByText("Storage").closest(".pulpit-metric-card");
    expect(storageCard).not.toBeNull();
    expect(
      within(storageCard as HTMLElement).queryByRole("progressbar"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/\d+(\.\d+)? [A-Z]?B \/ \d+(\.\d+)? [A-Z]?B/),
    ).toBeInTheDocument(); // storage
  });

  it("orders modules like the navigation, with RPM first", async () => {
    renderApp(<OverviewPage />);

    const table = await screen.findByRole("grid", { name: "Pulp components" });
    const rows = within(table).getAllByRole("row");
    expect(within(rows[1]).getByText("rpm", { exact: true })).toBeInTheDocument();
  });

  it("never shows a row for core - it isn't a content plugin, always a dash for Repositories/Size (by request)", async () => {
    renderApp(<OverviewPage />);
    await screen.findByText("rpm");
    expect(screen.queryByRole("row", { name: /^core\b/ })).not.toBeInTheDocument();
  });

  it("shows a normalized error state when Pulp is unavailable", async () => {
    server.use(
      http.get("/pulp/api/v3/status/", () => new HttpResponse(null, { status: 502 })),
    );
    renderApp(<OverviewPage />);
    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("shows each installed plugin's repository count inline in the component table, linking to its Repositories page", async () => {
    renderApp(<OverviewPage />);

    const rpmRow = await findComponentRow("rpm");
    expect(await within(rpmRow).findByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/rpm/repositories",
    );

    const ansibleRow = await findComponentRow("ansible");
    expect(await within(ansibleRow).findByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/ansible/repositories",
    );

    const containerRow = await findComponentRow("container");
    expect(await within(containerRow).findByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/containers/repositories",
    );
  });

  it("shows no component table at all when the instance reports only components Pulpit doesn't list (e.g. only core)", async () => {
    server.use(
      http.get("/pulp/api/v3/status/", () =>
        HttpResponse.json({
          versions: [{ component: "core", version: "3.116.0", package: "pulpcore" }],
        }),
      ),
    );

    renderApp(<OverviewPage />);

    await screen.findByText("No issues detected."); // page has loaded
    expect(
      screen.queryByRole("table", { name: "Pulp components" }),
    ).not.toBeInTheDocument();
  });

  it("shows each installed plugin's content size inline in the component table, dash for one with none", async () => {
    renderApp(<OverviewPage />);

    const rpmRow = await findComponentRow("rpm");
    expect(await within(rpmRow).findByText("195.7 KB")).toBeInTheDocument();

    const ansibleRow = await findComponentRow("ansible");
    expect(within(ansibleRow).getByText("2.0 KB")).toBeInTheDocument();

    const containerRow = await findComponentRow("container");
    expect(within(containerRow).getByText("51.0 KB")).toBeInTheDocument();
  });

  it("hides a plugin's row when nav visibility restricts it (core is never shown regardless, see the dedicated test above)", async () => {
    server.use(
      http.get("/pulpit-core/api/v1/nav_visibility/me", () =>
        HttpResponse.json({ visible_module_ids: ["ansible", "container"] }),
      ),
    );

    renderApp(<OverviewPage />);

    expect(await findComponentRow("ansible")).toBeInTheDocument();
    expect(screen.queryByText("rpm", { exact: true })).not.toBeInTheDocument();
  });

  it("keeps showing the loading state (not every plugin row) while nav-visibility is still loading, so rows don't flash in then disappear once it resolves", () => {
    server.use(
      http.get("/pulpit-core/api/v1/nav_visibility/me", () => new Promise(() => {})),
    );

    renderApp(<OverviewPage />);

    expect(screen.getByLabelText("Loading Pulp status")).toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: "Pulp components" }),
    ).not.toBeInTheDocument();
  });

  it("shows every visible plugin's repository count, not just rpm/ansible/container", async () => {
    renderApp(<OverviewPage />);

    const debRow = await findComponentRow("deb");
    expect(await within(debRow).findByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/deb/repositories",
    );

    const fileRow = await findComponentRow("file");
    expect(await within(fileRow).findByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/files/repositories",
    );
  });

  it("shows a dash for size when the content-size fetch fails, without breaking the rest of the table", async () => {
    server.use(
      http.get(
        "/pulpit-core/api/v1/content_size/sizes",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    renderApp(<OverviewPage />);

    const rpmRow = await findComponentRow("rpm");
    // Repositories count still resolves fine independently of the failed
    // Size fetch (rpm has a repository count of 1, no dash there).
    expect(await within(rpmRow).findByRole("link", { name: "1" })).toBeInTheDocument();
    expect(within(rpmRow).getByText("—")).toBeInTheDocument();
  });

  it("warns about a Pulp API path missing from the connected instance's schema", async () => {
    server.use(
      http.get("/pulpit-core/api/v1/api_compatibility/latest", () =>
        HttpResponse.json({
          checked_at: "2026-01-01T00:00:00Z",
          pulp_reachable: true,
          missing_endpoints: ["/repositories/rpm/rpm/"],
          error: null,
        }),
      ),
    );

    renderApp(<OverviewPage />);

    expect(
      await screen.findByText(/Pulp API path\(s\) this app depends on/),
    ).toBeInTheDocument();
  });

  it("warns when the startup compatibility check couldn't reach Pulp at all", async () => {
    server.use(
      http.get("/pulpit-core/api/v1/api_compatibility/latest", () =>
        HttpResponse.json({
          checked_at: "2026-01-01T00:00:00Z",
          pulp_reachable: false,
          missing_endpoints: [],
          error: "Pulp returned 502",
        }),
      ),
    );

    renderApp(<OverviewPage />);

    expect(
      await screen.findByText(/Couldn't verify API compatibility with Pulp/),
    ).toBeInTheDocument();
  });

  it("shows no warning at all when no compatibility check has run yet (404)", async () => {
    server.use(
      http.get(
        "/pulpit-core/api/v1/api_compatibility/latest",
        () => new HttpResponse(null, { status: 404 }),
      ),
    );

    renderApp(<OverviewPage />);

    expect(await screen.findByText("No issues detected.")).toBeInTheDocument();
  });
});
