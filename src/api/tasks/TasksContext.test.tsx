import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TasksProvider, useTasksContext } from "./TasksContext";

function Probe() {
  const { trackedTasks, registerTask, setTaskActive, activeTaskHrefs } =
    useTasksContext();
  return (
    <>
      <button
        onClick={() => {
          for (let index = 0; index < 35; index++)
            registerTask({ href: `task-${index}` });
        }}
      >
        Start work
      </button>
      <button
        onClick={() => {
          for (let index = 1; index < 35; index++) setTaskActive(`task-${index}`, false);
        }}
      >
        Finish recent work
      </button>
      <output data-testid="tasks">
        {trackedTasks.map((task) => task.href).join(",")}
      </output>
      <output data-testid="active">{activeTaskHrefs.size}</output>
    </>
  );
}
describe("task retention", () => {
  it("retains every active task while bounding finished history", () => {
    render(
      <TasksProvider>
        <Probe />
      </TasksProvider>,
    );
    fireEvent.click(screen.getByText("Start work"));
    expect(screen.getByTestId("tasks").textContent?.split(",")).toHaveLength(35);
    expect(screen.getByTestId("active")).toHaveTextContent("35");
    fireEvent.click(screen.getByText("Finish recent work"));
    expect(screen.getByTestId("tasks").textContent?.split(",")).toHaveLength(21);
    expect(screen.getByTestId("tasks").textContent?.split(",")).toContain("task-0");
    expect(screen.getByTestId("active")).toHaveTextContent("1");
  });
});
