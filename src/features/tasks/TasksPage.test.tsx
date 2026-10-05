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
import { TaskDetailModal } from "./TaskDetailModal";

const BASE = "/pulp/api/v3/tasks/";

describe("TasksPage", () => {
  it("combines type and state filters across the history and saves them in the URL", async () => {
    renderApp(<TasksPage />, {
      route: "/tasks?type=publish&state=failed",
      path: "/tasks",
    });
    expect(await screen.findByText("failed")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by task type")).toHaveValue("publish");
    expect(screen.queryByText("completed")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filter by task type"), {
      target: { value: "sync" },
    });
    expect(await screen.findByText("No matching tasks")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filter by state"), { target: { value: "" } });
    expect(await screen.findByText("completed")).toBeInTheDocument();
    expect(screen.queryByText("failed")).not.toBeInTheDocument();
  });

  it("resets pagination before applying a task type and sends both name filters to Pulp", async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get(BASE, ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json({
          count: 100,
          next: null,
          previous: null,
          results: [TASK_HISTORY_FIXTURE_COMPLETED],
        });
      }),
    );
    renderApp(<TasksPage />);
    await screen.findByText("completed");
    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
    await screen.findByText("completed");
    fireEvent.change(screen.getByLabelText("Filter by task type"), {
      target: { value: "sync" },
    });
    await screen.findByText("completed");
    const query = queries.at(-1)!;
    expect(query.get("offset")).toBe("0");
    expect(query.get("name__in")).toContain(
      "pulp_rpm.app.tasks.synchronizing.synchronize",
    );
    fireEvent.change(screen.getByLabelText("Search tasks by name"), {
      target: { value: "rpm" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("completed");
    expect(queries.at(-1)!.get("name__contains")).toBe("rpm");
    expect(queries.at(-1)!.get("name__in")).toContain("synchronize");
  });
  it("explains a missing worker and reveals the original error on request", async () => {
    const task: PulpTask = {
      ...TASK_HISTORY_FIXTURE_FAILED,
      error: { reason: "Worker has gone missing.", traceback: "Diagnostic traceback" },
    };
    server.use(http.get(task.pulp_href, () => HttpResponse.json(task)));
    renderApp(
      <TaskDetailModal href={task.pulp_href} initialTask={task} onClose={() => {}} />,
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Pulp worker stopped responding"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Check whether Pulp was restarted/),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/Diagnostic traceback/)).not.toBeVisible();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Technical error details" }),
    );
    expect(within(dialog).getByText(/Diagnostic traceback/)).toBeVisible();
  });

  it("shows a useful failure message even if Pulp supplied no error", async () => {
    const task: PulpTask = { ...TASK_HISTORY_FIXTURE_FAILED, error: null };
    server.use(http.get(task.pulp_href, () => HttpResponse.json(task)));
    renderApp(
      <TaskDetailModal href={task.pulp_href} initialTask={task} onClose={() => {}} />,
    );
    expect(
      await screen.findByText(/without providing an error message/),
    ).toBeInTheDocument();
  });
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

  it("keeps diagnostics hidden until technical details are expanded", async () => {
    renderApp(<TasksPage />);

    const completedRow = await screen.findByRole("row", {
      name: new RegExp(humanizeTaskName(TASK_HISTORY_FIXTURE_COMPLETED.name!)),
    });
    fireEvent.click(within(completedRow).getByRole("button", { name: "View details" }));

    const dialog = await screen.findByRole("dialog");
    const taskName = within(dialog).getByText(TASK_HISTORY_FIXTURE_COMPLETED.name!);
    expect(taskName).not.toBeVisible();
    expect(within(dialog).getByText("State")).toBeVisible();
    expect(within(dialog).getByText("Duration")).toBeVisible();
    const toggle = within(dialog).getByRole("button", {
      name: "Technical details",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(taskName).toBeVisible();
    fireEvent.click(toggle);
    expect(taskName).not.toBeVisible();
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
    ).not.toBeVisible();
    fireEvent.click(within(dialog).getByRole("button", { name: "Technical details" }));
    expect(
      within(dialog).getByText(TASK_HISTORY_FIXTURE_FAILED.logging_cid!),
    ).toBeVisible();
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
