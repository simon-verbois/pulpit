import { describe, expect, it } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../test/mswServer";
import { renderApp } from "../../test/renderApp";
import {
  ACCESS_USER_FIXTURE,
  RPM_REPO_FIXTURE,
  TASK_HISTORY_FIXTURE_COMPLETED,
  TASK_HISTORY_FIXTURE_FAILED,
} from "../../test/handlers";
import { humanizeTaskName } from "./humanizeTaskName";
import { TasksPage } from "./TasksPage";

const BASE = "/pulp/api/v3/tasks/";

describe("TasksPage", () => {
  it("lists the seeded task history with state and created-by", async () => {
    renderApp(<TasksPage />);

    const completedRow = await screen.findByRole("row", {
      name: new RegExp(humanizeTaskName(TASK_HISTORY_FIXTURE_COMPLETED.name!)),
    });
    expect(within(completedRow).getByText("completed")).toBeInTheDocument();
    expect(
      await within(completedRow).findByText(ACCESS_USER_FIXTURE.username),
    ).toBeInTheDocument();

    const failedRow = screen.getByRole("row", {
      name: new RegExp(humanizeTaskName(TASK_HISTORY_FIXTURE_FAILED.name!)),
    });
    expect(within(failedRow).getByText("failed")).toBeInTheDocument();
    expect(within(failedRow).getByText("System")).toBeInTheDocument();
  });

  it("still shows the raw Pulp task name in full in the detail modal", async () => {
    renderApp(<TasksPage />);

    const completedRow = await screen.findByRole("row", {
      name: new RegExp(humanizeTaskName(TASK_HISTORY_FIXTURE_COMPLETED.name!)),
    });
    fireEvent.click(within(completedRow).getByRole("button", { name: "View details" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(TASK_HISTORY_FIXTURE_COMPLETED.name!),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no tasks", async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    renderApp(<TasksPage />);

    expect(await screen.findByText("No tasks found")).toBeInTheDocument();
  });

  it("shows a normalized error state when the list request fails", async () => {
    server.use(http.get(BASE, () => new HttpResponse(null, { status: 502 })));

    renderApp(<TasksPage />);

    expect(await screen.findByText(/Pulp is currently unavailable/i)).toBeInTheDocument();
  });

  it("opens a detail modal showing the failed task's error", async () => {
    renderApp(<TasksPage />);

    const failedRow = await screen.findByRole("row", {
      name: new RegExp(humanizeTaskName(TASK_HISTORY_FIXTURE_FAILED.name!)),
    });
    fireEvent.click(within(failedRow).getByRole("button", { name: "View details" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(TASK_HISTORY_FIXTURE_FAILED.error!.description!),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(TASK_HISTORY_FIXTURE_FAILED.logging_cid!),
    ).toBeInTheDocument();
  });

  it("filters by state", async () => {
    renderApp(<TasksPage />);

    await screen.findByText("completed");
    fireEvent.change(screen.getByLabelText("Filter by state"), {
      target: { value: "failed" },
    });

    expect(await screen.findByText("failed")).toBeInTheDocument();
    expect(screen.queryByText("completed")).not.toBeInTheDocument();
  });

  it("names the repository a task ran against, linked to its page", async () => {
    renderApp(<TasksPage />);

    const link = await screen.findByRole("link", { name: RPM_REPO_FIXTURE.name });
    expect(link).toHaveAttribute("href", `/rpm/repositories/${RPM_REPO_FIXTURE.name}`);
    const row = link.closest("tr")!;
    expect(within(row).getByText("RPM repository")).toBeInTheDocument();
    expect(within(row).getByText("Sync")).toBeInTheDocument();
  });

  it("opens the task named in ?task= - where the Tasks drawer links to", async () => {
    renderApp(<TasksPage />, { route: "/tasks?task=history-2", path: "/tasks" });

    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByText(TASK_HISTORY_FIXTURE_FAILED.error!.description!),
    ).toBeInTheDocument();
  });

  it("titles the detail modal with the task's action and resource", async () => {
    renderApp(<TasksPage />, { route: "/tasks?task=history-1", path: "/tasks" });

    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByText(`Sync RPM repository "${RPM_REPO_FIXTURE.name}"`),
    ).toBeInTheDocument();
  });
});
