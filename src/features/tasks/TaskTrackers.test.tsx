import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import { renderApp } from "../../test/renderApp";
import { RPM_DISTRIBUTION_FIXTURE, RPM_REPO_FIXTURE } from "../../test/handlers";
import { RepositoryDistributionsTab } from "../rpm/repositories/RepositoryDistributionsTab";
import { TaskTrackers } from "./TaskTrackers";

describe("TaskTrackers", () => {
  it(
    "invalidates a completed task's queries even when the Tasks drawer is " +
      "never rendered/opened - the real bug: PatternFly's Drawer only mounts " +
      "<TasksDrawer>'s own polling once the drawer has first been expanded " +
      "(see DrawerPanelContent's isExpandedInternal), so a headless tracker " +
      "mounted unconditionally (src/app/layout/AppLayout.tsx) is required",
    async () => {
      renderApp(
        <>
          <RepositoryDistributionsTab repository={RPM_REPO_FIXTURE} />
          <TaskTrackers />
        </>,
      );

      await screen.findByText(RPM_DISTRIBUTION_FIXTURE.name);
      fireEvent.click(screen.getAllByRole("button", { name: "Create distribution" })[0]);

      const dialog = await screen.findByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText("Base path", { exact: false }), {
        target: { value: "tracked-only-path" },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      // No <TasksDrawer> is mounted anywhere in this test - if invalidation
      // depended on it (the pre-fix bug), this would never appear.
      expect(await screen.findAllByText("tracked-only-path")).not.toHaveLength(0);
    },
  );
});
