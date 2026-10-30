import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mswServer";
import { renderApp } from "../../test/renderApp";
import { useTasksContext } from "../../api/tasks/TasksContext";
import { TaskRecovery } from "./TaskRecovery";

function Probe() {
  const { trackedTasks, registerTask } = useTasksContext();
  return (
    <>
      <button
        onClick={() =>
          registerTask({
            href: "/pulp/api/v3/tasks/restored/",
            label: "Browser label",
            action: "sync",
            invalidateKeys: [["specific-cache"]],
          })
        }
      >
        Register browser metadata
      </button>
      <output>
        {trackedTasks
          .map((task) => `${task.label}:${task.resourceHrefs?.join(",")}:${task.action}`)
          .join(";")}
      </output>
    </>
  );
}
describe("active operation recovery", () => {
  it("restores active repository locks from Pulp PRNs after reload", async () => {
    const repository = "/pulp/api/v3/repositories/rpm/rpm/active/";
    server.use(
      http.get("/pulp/api/v3/tasks/", () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: "/pulp/api/v3/tasks/restored/",
              name: "pulp_rpm.app.tasks.synchronizing.synchronize",
              state: "running",
              reserved_resources_record: ["prn:rpm.rpmrepository:active"],
            },
          ],
        }),
      ),
      http.get("/pulp/api/v3/repositories/", () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: repository,
              name: "active",
              prn: "prn:rpm.rpmrepository:active",
            },
          ],
        }),
      ),
      http.get("/pulpit-core/api/v1/jobs", () =>
        HttpResponse.json({ count: 0, results: [] }),
      ),
    );
    renderApp(
      <>
        <TaskRecovery />
        <Probe />
      </>,
    );
    expect(await screen.findByText(new RegExp(repository))).toHaveTextContent(":sync");
    fireEvent.click(screen.getByText("Register browser metadata"));
    expect(screen.getByRole("status")).toHaveTextContent("Browser label");
  });
});
