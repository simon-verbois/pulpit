import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../test/mswServer";
import { renderApp } from "../../test/renderApp";
import { OverviewPage } from "./OverviewPage";

describe("OverviewPage", () => {
  it("renders real Pulp status data once loaded", async () => {
    renderApp(<OverviewPage />);
    expect(await screen.findByText("rpm")).toBeInTheDocument();
    expect(screen.getByText("3.38.5")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument(); // database
    expect(screen.getByText("Disconnected")).toBeInTheDocument(); // redis
    expect(
      screen.getByText(/\d+(\.\d+)? [A-Z]?B \/ \d+(\.\d+)? [A-Z]?B/),
    ).toBeInTheDocument(); // storage
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

    const rpmRow = await screen.findByRole("row", { name: /^rpm\b/ });
    expect(await within(rpmRow).findByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/rpm/repositories",
    );

    const ansibleRow = screen.getByRole("row", { name: /^ansible\b/ });
    expect(await within(ansibleRow).findByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/ansible/repositories",
    );

    const containerRow = screen.getByRole("row", { name: /^container\b/ });
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

    const rpmRow = await screen.findByRole("row", { name: /^rpm\b/ });
    expect(await within(rpmRow).findByText("195.7 KB")).toBeInTheDocument();

    const ansibleRow = screen.getByRole("row", { name: /^ansible\b/ });
    expect(within(ansibleRow).getByText("2.0 KB")).toBeInTheDocument();

    const containerRow = screen.getByRole("row", { name: /^container\b/ });
    expect(within(containerRow).getByText("51.0 KB")).toBeInTheDocument();
  });

  it("hides a plugin's row when nav visibility restricts it (core is never shown regardless, see the dedicated test above)", async () => {
    server.use(
      http.get("/pulpit-core/api/v1/nav_visibility/me", () =>
        HttpResponse.json({ visible_module_ids: ["ansible", "container"] }),
      ),
    );

    renderApp(<OverviewPage />);

    expect(await screen.findByRole("row", { name: /^ansible\b/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /^rpm\b/ })).not.toBeInTheDocument();
  });

  it("shows every visible plugin's repository count, not just rpm/ansible/container", async () => {
    renderApp(<OverviewPage />);

    const debRow = await screen.findByRole("row", { name: /^deb\b/ });
    expect(await within(debRow).findByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/deb/repositories",
    );

    const fileRow = screen.getByRole("row", { name: /^file\b/ });
    expect(await within(fileRow).findByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/files/repositories",
    );
  });

  it("shows a dash for size when the content-size fetch fails, without breaking the rest of the table", async () => {
    server.use(
      http.get("/pulp/api/v3/content/", () => new HttpResponse(null, { status: 502 })),
    );

    renderApp(<OverviewPage />);

    const rpmRow = await screen.findByRole("row", { name: /^rpm\b/ });
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
