import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../test/mswServer";
import { renderApp } from "../../test/renderApp";
import { PULP_STATUS_FIXTURE } from "../../test/handlers";
import { AppNav } from "./AppNav";

describe("AppNav", () => {
  it("shows every plugin nav group when the instance reports every component", async () => {
    renderApp(<AppNav />);

    expect(await screen.findByRole("button", { name: "RPM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Container" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ansible" })).toBeInTheDocument();
  });

  it("hides a plugin's nav group when the status endpoint reports it isn't installed", async () => {
    server.use(
      http.get("/pulp/api/v3/status/", () =>
        HttpResponse.json({
          ...PULP_STATUS_FIXTURE,
          versions: PULP_STATUS_FIXTURE.versions.filter((v) => v.component !== "ansible"),
        }),
      ),
    );

    renderApp(<AppNav />);

    expect(await screen.findByRole("button", { name: "RPM" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Ansible" })).not.toBeInTheDocument(),
    );
  });

  it("shows placeholder rows (not every real group) while status is still loading, so nothing flashes in then disappears once it resolves", () => {
    server.use(http.get("/pulp/api/v3/status/", () => new Promise(() => {})));

    renderApp(<AppNav />);

    expect(screen.getByText("Loading navigation")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "RPM" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ansible" })).not.toBeInTheDocument();
  });

  it("fails open (shows every group) if the status request errors", async () => {
    server.use(
      http.get("/pulp/api/v3/status/", () => new HttpResponse(null, { status: 502 })),
    );

    renderApp(<AppNav />);

    // No status data ever arrives, so nothing is ever positively confirmed
    // absent - the groups are present once the (errored) request settles.
    expect(await screen.findByRole("button", { name: "RPM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ansible" })).toBeInTheDocument();
  });

  it("shows only the granted modules when nav-visibility is restricted", async () => {
    server.use(
      http.get("/pulpit-core/api/v1/nav_visibility/me", () =>
        HttpResponse.json({ visible_module_ids: ["rpm"] }),
      ),
    );

    renderApp(<AppNav />);

    expect(await screen.findByRole("button", { name: "RPM" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Maven" })).not.toBeInTheDocument(),
    );
  });

  it("hides every plugin group when nav-visibility grants nothing", async () => {
    server.use(
      http.get("/pulpit-core/api/v1/nav_visibility/me", () =>
        HttpResponse.json({ visible_module_ids: [] }),
      ),
    );

    renderApp(<AppNav />);

    // Core, always-visible items are untouched - this is a plugin-module
    // restriction, not a lockout from the app itself. Wait on one of these
    // first so the assertions below land after the settled (non-skeleton)
    // render, not the momentary loading placeholder.
    expect(await screen.findByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "RPM" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Maven" })).not.toBeInTheDocument();
  });

  it("shows placeholder rows (not every real group) while nav-visibility settings are still loading, so nothing flashes in then disappears once it resolves", () => {
    server.use(
      http.get("/pulpit-core/api/v1/nav_visibility/me", () => new Promise(() => {})),
    );

    renderApp(<AppNav />);

    expect(screen.getByText("Loading navigation")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "RPM" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Maven" })).not.toBeInTheDocument();
  });

  it("fails open (shows every group) if the nav-visibility request errors", async () => {
    server.use(
      http.get(
        "/pulpit-core/api/v1/nav_visibility/me",
        () => new HttpResponse(null, { status: 502 }),
      ),
    );

    renderApp(<AppNav />);

    expect(await screen.findByRole("button", { name: "RPM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Maven" })).toBeInTheDocument();
  });

  it("keeps a manually-expanded group open after navigating to a different group's page (BUG FOUND LIVE: navigation used to collapse it)", async () => {
    renderApp(<AppNav />, { route: "/rpm/repositories", path: "*" });

    // RPM auto-expands because the current route lives inside it.
    expect(await screen.findByRole("link", { name: "Packages" })).toBeInTheDocument();

    // Manually expand a second, unrelated group.
    fireEvent.click(screen.getByRole("button", { name: "Debian" }));
    expect(await screen.findByRole("link", { name: "Content" })).toBeInTheDocument();

    // Navigate to a page inside that second group.
    fireEvent.click(screen.getByRole("link", { name: "Content" }));

    // Both groups should still be expanded - RPM must not have collapsed
    // just because the current route moved out of it.
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Packages" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "Content" })).toBeInTheDocument();
  });

  it("still lets a manually-collapsed group be closed even while it contains the current page", async () => {
    renderApp(<AppNav />, { route: "/rpm/repositories", path: "*" });

    expect(await screen.findByRole("link", { name: "Packages" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "RPM" }));

    await waitFor(() =>
      expect(screen.queryByRole("link", { name: "Packages" })).not.toBeInTheDocument(),
    );
  });
});
