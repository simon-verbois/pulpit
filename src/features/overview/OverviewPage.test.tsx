import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../test/mswServer";
import { renderApp } from "../../test/renderApp";
import { OverviewPage } from "./OverviewPage";

describe("OverviewPage", () => {
  it("renders real Pulp status data once loaded", async () => {
    renderApp(<OverviewPage />);
    expect(await screen.findByText("core")).toBeInTheDocument();
    expect(screen.getByText("3.116.0")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument(); // database
    expect(screen.getByText("Disconnected")).toBeInTheDocument(); // redis
    expect(screen.getByText(/used of/)).toBeInTheDocument(); // storage
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

    // A component Pulpit has no Repositories page for at all (e.g. core,
    // pulpcore-core itself) shows a plain dash in that column, not a
    // broken/empty cell. (Two dashes on this row: Repositories and Size -
    // core never gets a content_size entry either, see next test.)
    const coreRow = screen.getByRole("row", { name: /^core\b/ });
    expect(within(coreRow).getAllByText("—")).toHaveLength(2);
  });

  it("shows a dash for every component's repository count when the instance reports no plugins at all", async () => {
    server.use(
      http.get("/pulp/api/v3/status/", () =>
        HttpResponse.json({
          versions: [{ component: "core", version: "3.116.0", package: "pulpcore" }],
        }),
      ),
    );

    renderApp(<OverviewPage />);

    const coreRow = await screen.findByRole("row", { name: /^core\b/ });
    expect(within(coreRow).getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows each installed plugin's content size inline in the component table, dash for one with none", async () => {
    renderApp(<OverviewPage />);

    const rpmRow = await screen.findByRole("row", { name: /^rpm\b/ });
    expect(await within(rpmRow).findByText("195.7 KB")).toBeInTheDocument();

    const ansibleRow = screen.getByRole("row", { name: /^ansible\b/ });
    expect(within(ansibleRow).getByText("2.0 KB")).toBeInTheDocument();

    const containerRow = screen.getByRole("row", { name: /^container\b/ });
    expect(within(containerRow).getByText("51.0 KB")).toBeInTheDocument();

    // core never gets a content_size entry (see COMPONENT_CONTENT_SIZES_FIXTURE) -
    // its Size cell is a plain dash, not a fabricated 0.
    const coreRow = screen.getByRole("row", { name: /^core\b/ });
    expect(within(coreRow).getAllByText("—")).toHaveLength(2);
  });

  it("shows a dash for size when the content-size fetch fails, without breaking the rest of the table", async () => {
    server.use(
      http.get(
        "/pulpit-core/api/v1/content_size/sizes",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    renderApp(<OverviewPage />);

    const rpmRow = await screen.findByRole("row", { name: /^rpm\b/ });
    // Repositories count still resolves fine independently of the failed
    // Size fetch (rpm has a repository count of 1, no dash there).
    expect(await within(rpmRow).findByRole("link", { name: "1" })).toBeInTheDocument();
    expect(within(rpmRow).getByText("—")).toBeInTheDocument();
  });
});
