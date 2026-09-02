import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../test/mswServer";
import { renderApp } from "../../test/renderApp";
import { PULP_STATUS_FIXTURE } from "../../test/handlers";
import { AppNav } from "./AppNav";

describe("AppNav", () => {
  it("shows every plugin nav group when the instance reports every component", async () => {
    renderApp(<AppNav />);

    expect(await screen.findByRole("button", { name: "RPM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Containers" })).toBeInTheDocument();
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

  it("fails open (shows every group) while status is still loading", () => {
    server.use(http.get("/pulp/api/v3/status/", () => new Promise(() => {})));

    renderApp(<AppNav />);

    expect(screen.getByRole("button", { name: "RPM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ansible" })).toBeInTheDocument();
  });

  it("fails open (shows every group) if the status request errors", async () => {
    server.use(
      http.get("/pulp/api/v3/status/", () => new HttpResponse(null, { status: 502 })),
    );

    renderApp(<AppNav />);

    // No status data ever arrives, so nothing is ever positively confirmed
    // absent - the groups are present from the very first render.
    expect(screen.getByRole("button", { name: "RPM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ansible" })).toBeInTheDocument();
  });
});
