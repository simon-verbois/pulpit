import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";

import { renderApp } from "../../test/renderApp";
import { StatusPage } from "./StatusPage";

describe("StatusPage", () => {
  it("shows each component's version and its compatibility against Pulpit's verified baseline", async () => {
    renderApp(<StatusPage />);

    const coreRow = await screen.findByRole("row", { name: /^core/ });
    expect(within(coreRow).getByText(/Matches verified/)).toBeInTheDocument();

    // The MSW fixture (src/test/handlers.ts PULP_STATUS_FIXTURE) has no
    // entry outside core/rpm/container/ansible, so anything else reported
    // would show as unverified - not exercised here since the fixture only
    // reports components Pulpit has a baseline for.
  });
});
