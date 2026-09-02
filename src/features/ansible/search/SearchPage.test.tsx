import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { SearchPage } from "./SearchPage";

const BASE =
  "/pulp_ansible/galaxy/default/api/v3/plugin/ansible/search/collection-versions/";

describe("Ansible SearchPage", () => {
  it(
    "renders results from the Galaxy-v3 {meta, links, data} envelope - a " +
      "real regression this app hit assuming the normal Pulp pagination shape",
    async () => {
      server.use(
        http.get(BASE, () =>
          HttpResponse.json({
            meta: { count: 1 },
            links: { first: null, previous: null, next: null, last: null },
            data: [
              {
                collection_version: {
                  pulp_href: "/pulp/api/v3/content/ansible/collection_versions/cv-1/",
                  namespace: "pulpit_test",
                  name: "demo",
                  version: "1.0.0",
                },
                repository: {
                  pulp_href: "/pulp/api/v3/repositories/ansible/ansible/repo-1/",
                  name: "test-ansible-repo",
                },
                is_highest: true,
                is_deprecated: false,
                is_signed: true,
              },
            ],
          }),
        ),
      );

      renderApp(<SearchPage />);

      await waitFor(() => expect(screen.getByText("pulpit_test")).toBeInTheDocument());
      expect(screen.getByText("demo")).toBeInTheDocument();
      expect(screen.getByText("test-ansible-repo")).toBeInTheDocument();
      expect(screen.getByText("Highest")).toBeInTheDocument();
      expect(screen.getByText("Signed")).toBeInTheDocument();
    },
  );

  it("shows an empty state when data is an empty array", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({
          meta: { count: 0 },
          links: { first: null, previous: null, next: null, last: null },
          data: [],
        }),
      ),
    );

    renderApp(<SearchPage />);

    await waitFor(() =>
      expect(screen.getByText("No collections found")).toBeInTheDocument(),
    );
  });
});
