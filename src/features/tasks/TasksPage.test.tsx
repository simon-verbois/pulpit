import { describe, expect, it } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../test/mswServer";
import { renderApp } from "../../test/renderApp";
import {
  ACCESS_USER_FIXTURE,
  JOB_FIXTURE_RESIGN,
  RPM_REPO_FIXTURE,
  TASK_HISTORY_FIXTURE_COMPLETED,
  TASK_HISTORY_FIXTURE_FAILED,
} from "../../test/handlers";
import type { PulpTask } from "../../api/client/tasks";
import { humanizeTaskName } from "./humanizeTaskName";
import { TasksPage } from "./TasksPage";

const BASE = "/pulp/api/v3/tasks/";

describe("TasksPage", () => {
  it("lists pulpit-core background jobs on their own tab, with their repository", async () => {
    renderApp(<TasksPage />, { route: "/tasks?tab=jobs", path: "/tasks" });

    const resignRow = await screen.findByRole("row", {
      name: /Re-sign repository packages/,
    });
    expect(within(resignRow).getByText("success")).toBeInTheDocument();
    expect(within(resignRow).getByText("admin")).toBeInTheDocument();
    expect(
      await within(resignRow).findByRole("link", { name: RPM_REPO_FIXTURE.name }),
    ).toBeInTheDocument();

    const failedRow = screen.getByRole("row", { name: /Apply LDAP configuration/ });
    expect(within(failedRow).getByText("System")).toBeInTheDocument();

    fireEvent.click(within(resignRow).getByRole("button", { name: "View details" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(JOB_FIXTURE_RESIGN.job_type)).toBeInTheDocument();
    expect(within(dialog).getByText(/"evaluated": 35/)).toBeInTheDocument();
  });

  it("opens a job linked from the Tasks drawer by id", async () => {
    renderApp(<TasksPage />, {
      route: `/tasks?tab=jobs&job=${JOB_FIXTURE_RESIGN.id}`,
      path: "/tasks",
    });

    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByText("Re-sign repository packages"),
    ).toBeInTheDocument();
  });

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
    expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();
  });

  it("stops a running task after confirmation and refreshes its state", async () => {
    const runningTask: PulpTask = {
      ...TASK_HISTORY_FIXTURE_COMPLETED,
      pulp_href: `${BASE}running-1/`,
      state: "running",
      finished_at: null,
    };
    let currentTask = runningTask;
    let requestBody: unknown;
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [currentTask],
        }),
      ),
      http.patch(`${BASE}:id/`, async ({ request }) => {
        requestBody = await request.json();
        currentTask = { ...currentTask, state: "canceling" };
        return HttpResponse.json(currentTask);
      }),
    );

    renderApp(<TasksPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Stop" }));
    const dialog = screen.getByRole("dialog", { name: "Stop task?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Stop task" }));

    expect(await screen.findByText("canceling")).toBeInTheDocument();
    expect(requestBody).toEqual({ state: "canceled" });
    expect(screen.queryByRole("dialog", { name: "Stop task?" })).not.toBeInTheDocument();
  });

  it("keeps the stop confirmation open and shows Pulp conflicts", async () => {
    const runningTask: PulpTask = {
      ...TASK_HISTORY_FIXTURE_COMPLETED,
      pulp_href: `${BASE}running-2/`,
      state: "running",
      finished_at: null,
    };
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [runningTask],
        }),
      ),
      http.patch(`${BASE}:id/`, () =>
        HttpResponse.json({ detail: "Task is already completed." }, { status: 409 }),
      ),
    );

    renderApp(<TasksPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Stop" }));
    const dialog = screen.getByRole("dialog", { name: "Stop task?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Stop task" }));

    expect(
      await within(dialog).findByText("Task is already completed."),
    ).toBeInTheDocument();
    expect(dialog).toBeInTheDocument();
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
