import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../../test/mswServer";
import { renderApp } from "../../../test/renderApp";
import { RemotesPage } from "./RemotesPage";

const COLLECTION_BASE = "/pulp/api/v3/remotes/ansible/collection/";
const GIT_BASE = "/pulp/api/v3/remotes/ansible/git/";
const ROLE_BASE = "/pulp/api/v3/remotes/ansible/role/";

const COLLECTION_REMOTE = {
  pulp_href: `${COLLECTION_BASE}c-1/`,
  name: "my-collection-remote",
  url: "https://galaxy.ansible.com/api/",
  policy: "immediate",
};
const GIT_REMOTE = {
  pulp_href: `${GIT_BASE}g-1/`,
  name: "my-git-remote",
  url: "https://example.com/role.git",
  git_ref: "main",
};
const ROLE_REMOTE = {
  pulp_href: `${ROLE_BASE}r-1/`,
  name: "my-role-remote",
  url: "https://example.com/roles/",
  policy: "immediate",
};

function page(results: unknown[]) {
  return HttpResponse.json({
    count: results.length,
    next: null,
    previous: null,
    results,
  });
}

describe("Ansible RemotesPage", () => {
  it("defaults to the Collection tab and switches between all three remote flavors", async () => {
    server.use(
      http.get(COLLECTION_BASE, () => page([COLLECTION_REMOTE])),
      http.get(GIT_BASE, () => page([GIT_REMOTE])),
      http.get(ROLE_BASE, () => page([ROLE_REMOTE])),
    );

    renderApp(<RemotesPage />);

    await waitFor(() =>
      expect(screen.getByText("my-collection-remote")).toBeInTheDocument(),
    );
    expect(screen.queryByText("my-git-remote")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Git" }));
    await waitFor(() => expect(screen.getByText("my-git-remote")).toBeInTheDocument());
    expect(screen.queryByText("my-collection-remote")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Role" }));
    await waitFor(() => expect(screen.getByText("my-role-remote")).toBeInTheDocument());
  });
});
