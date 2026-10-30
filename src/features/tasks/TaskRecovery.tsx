import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button } from "@patternfly/react-core";

import { listTasks } from "../../api/client/tasks";
import { resolveTaskResources, taskResources } from "../../api/client/taskResources";
import { collectPulpPages } from "../../api/client/pagination";
import { listJobs } from "../../api/client/pulpitCore/jobs";
import { useTasksContext, type TrackedTask } from "../../api/tasks/TasksContext";
import { jobLabel } from "./jobLabel";
import { humanizeTaskName } from "./humanizeTaskName";

async function recoverTasks(): Promise<TrackedTask[]> {
  const tasks = await collectPulpPages((offset) =>
    listTasks({
      limit: 100,
      offset,
      state__in: "waiting,running,canceling",
    }),
  );
  const recovered = new Map<string, TrackedTask>();
  const resources = await resolveTaskResources(tasks.flatMap(taskResources));
  for (const task of tasks) {
    const href = task.task_group || task.pulp_href;
    const previous = recovered.get(href);
    recovered.set(href, {
      href,
      kind: task.task_group ? "group" : "pulp",
      label: task.task_group ? "Task group" : humanizeTaskName(task.name ?? "Pulp task"),
      action:
        task.name?.includes("synchron") || task.name?.endsWith(".sync")
          ? "sync"
          : undefined,
      resourceHrefs: [
        ...new Set([
          ...(previous?.resourceHrefs ?? []),
          ...taskResources(task).flatMap((resource) =>
            resources[resource.key] ? [resources[resource.key].pulp_href] : [],
          ),
        ]),
      ],
      invalidateKeys: [["pulp"], ["pulpit-core"]],
    });
  }
  return [...recovered.values()];
}

async function recoverJobs(): Promise<TrackedTask[]> {
  const statuses = ["queued", "running"] as const;
  const pages = await Promise.all(
    statuses.map((status) =>
      collectPulpPages(async (offset) => {
        const page = await listJobs({ limit: 100, offset, status });
        return {
          ...page,
          previous: null,
          next: offset + page.results.length < page.count ? "more" : null,
        };
      }),
    ),
  );
  return pages.flat().map((job) => ({
    href: job.id,
    kind: "job",
    label: jobLabel(job.job_type),
    resourceHrefs: job.repository_href ? [job.repository_href] : [],
    invalidateKeys: [["pulp"], ["pulpit-core"]],
  }));
}

/** Restore server-owned active work after reload without browser task storage. */
export function TaskRecovery() {
  const { registerTask } = useTasksContext();
  const tasks = useQuery({
    queryKey: ["pulp", "active-task-recovery"],
    queryFn: recoverTasks,
    staleTime: Infinity,
  });
  const jobs = useQuery({
    queryKey: ["pulpit-core", "active-job-recovery"],
    queryFn: recoverJobs,
    staleTime: Infinity,
  });
  useEffect(() => {
    for (const task of tasks.data ?? []) registerTask(task, true);
  }, [tasks.data, registerTask]);
  useEffect(() => {
    for (const job of jobs.data ?? []) registerTask(job, true);
  }, [jobs.data, registerTask]);
  if (!tasks.isError && !jobs.isError) return null;
  return (
    <Alert
      isInline
      variant="warning"
      title="Some active operations could not be resumed in the task drawer."
      actionLinks={
        <Button
          variant="link"
          onClick={() => {
            void tasks.refetch();
            void jobs.refetch();
          }}
        >
          Retry
        </Button>
      }
    >
      The server continues running them. Check Tasks before submitting the same operation
      again.
    </Alert>
  );
}
