import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { NamespacesPage } from "./NamespacesPage";

const DIST_BASE = "/pulp/api/v3/distributions/ansible/ansible/";
const NS_BASE =
  "/pulp_ansible/galaxy/default/api/v3/plugin/ansible/content/test-dist/namespaces/";

const DIST_FIXTURE = {
  pulp_href: `${DIST_BASE}dist-1/`,
  name: "test-dist",
  base_path: "test-dist",
  repository: "/pulp/api/v3/repositories/ansible/ansible/repo-1/",
};

const ORPHANED_DIST_FIXTURE = {
  pulp_href: `${DIST_BASE}dist-2/`,
  name: "orphaned-dist",
  base_path: "orphaned-dist",
  repository: null,
};

describe("Ansible NamespacesPage", () => {
  it("prompts for a distribution before showing any namespace list", async () => {
    server.use(
      http.get(DIST_BASE, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [DIST_FIXTURE],
        }),
      ),
    );

    renderApp(<NamespacesPage />);

    await waitFor(() =>
      expect(screen.getByText("Select a distribution")).toBeInTheDocument(),
    );
  });

  it("lists namespaces once a distribution is picked", async () => {
    server.use(
      http.get(DIST_BASE, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [DIST_FIXTURE],
        }),
      ),
      http.get(NS_BASE, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: "/pulp/api/v3/content/ansible/namespaces/ns-1/",
              name: "pulpit_test",
              company: "Pulpit",
              email: "",
              description: "",
              resources: "",
              links: [],
              avatar_url: null,
            },
          ],
        }),
      ),
    );

    renderApp(<NamespacesPage />);

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "test-dist" })).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Distribution" }), {
      target: { value: "test-dist" },
    });

    await waitFor(() => expect(screen.getByText("pulpit_test")).toBeInTheDocument());
    expect(screen.getByText("Pulpit")).toBeInTheDocument();
  });

  it(
    "excludes a distribution with no repository attached from the picker - VERIFIED live: its " +
      "Galaxy namespaces endpoint 403s (permission_denied) rather than returning an empty list",
    async () => {
      server.use(
        http.get(DIST_BASE, () =>
          HttpResponse.json({
            count: 2,
            next: null,
            previous: null,
            results: [DIST_FIXTURE, ORPHANED_DIST_FIXTURE],
          }),
        ),
      );

      renderApp(<NamespacesPage />);

      await waitFor(() =>
        expect(screen.getByRole("option", { name: "test-dist" })).toBeInTheDocument(),
      );
      expect(
        screen.queryByRole("option", { name: "orphaned-dist" }),
      ).not.toBeInTheDocument();
    },
  );
});
