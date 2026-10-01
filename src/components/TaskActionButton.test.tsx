import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TasksProvider, useTasksContext } from "../api/tasks/TasksContext";
import { TaskActionButton } from "./TaskActionButton";

const RESOURCE = "/pulp/api/v3/repositories/rpm/rpm/repository-id/";
const TASK = "/pulp/api/v3/tasks/task-id/";

function Harness() {
  const { registerTask, setTaskActive } = useTasksContext();

  return (
    <>
      <TaskActionButton resourceHref={RESOURCE} taskAction="sync">
        Sync
      </TaskActionButton>
      <TaskActionButton resourceHref={RESOURCE} taskAction="edit">
        Edit
      </TaskActionButton>
      <button
        onClick={() =>
          registerTask({
            href: TASK,
            label: "Sync repository",
            resourceHrefs: [RESOURCE],
            action: "sync",
          })
        }
      >
        Register task
      </button>
      <button onClick={() => setTaskActive(TASK, false)}>Complete task</button>
    </>
  );
}

describe("TaskActionButton", () => {
  it("disables every action on a busy resource and spins only the running action", async () => {
    render(
      <TasksProvider>
        <Harness />
      </TasksProvider>,
    );

    const sync = screen.getByRole("button", { name: "Sync" });
    const edit = screen.getByRole("button", { name: "Edit" });
    expect(sync).toBeEnabled();
    expect(edit).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Register task" }));

    expect(sync).toBeDisabled();
    expect(sync).toHaveAttribute("aria-busy", "true");
    expect(sync.querySelector(".pf-v6-c-spinner")).toBeInTheDocument();
    expect(edit).toBeDisabled();
    expect(edit).not.toHaveAttribute("aria-busy");
    expect(edit.querySelector(".pf-v6-c-spinner")).not.toBeInTheDocument();
    expect(sync).toHaveAttribute("title", "Sync repository");

    fireEvent.click(screen.getByRole("button", { name: "Complete task" }));
    expect(sync).toBeEnabled();
    expect(edit).toBeEnabled();
  });
});
