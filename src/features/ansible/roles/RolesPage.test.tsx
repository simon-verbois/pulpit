import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { ANSIBLE_ROLE_FIXTURE } from "../../../test/handlers";
import { RolesPage } from "./RolesPage";

const ROLES_BASE = "/pulp/api/v3/content/ansible/roles/";

describe("RolesPage", () => {
  it("renders the seeded role", async () => {
    renderApp(<RolesPage />);

    expect(await screen.findByText(ANSIBLE_ROLE_FIXTURE.name)).toBeInTheDocument();
  });

  it("shows an empty state when there are no roles", async () => {
    server.use(
      http.get(ROLES_BASE, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<RolesPage />);

    expect(await screen.findByText("No roles yet")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(http.get(ROLES_BASE, () => new HttpResponse(null, { status: 502 })));

    renderApp(<RolesPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("filters to matching roles client-side (this endpoint has no server-side name__contains)", async () => {
    server.use(
      http.get(ROLES_BASE, () =>
        HttpResponse.json({
          count: 2,
          next: null,
          previous: null,
          results: [
            ANSIBLE_ROLE_FIXTURE,
            { ...ANSIBLE_ROLE_FIXTURE, pulp_href: "role-2/", name: "unrelated" },
          ],
        }),
      ),
    );

    renderApp(<RolesPage />);

    expect(await screen.findByText("unrelated")).toBeInTheDocument();
    expect(screen.getByText(ANSIBLE_ROLE_FIXTURE.name)).toBeInTheDocument();

    const search = screen.getByLabelText("Search roles by name");
    fireEvent.change(search, { target: { value: ANSIBLE_ROLE_FIXTURE.name } });
    fireEvent.keyDown(search, { key: "Enter" });

    expect(await screen.findByText(ANSIBLE_ROLE_FIXTURE.name)).toBeInTheDocument();
    expect(screen.queryByText("unrelated")).not.toBeInTheDocument();
  });
});
