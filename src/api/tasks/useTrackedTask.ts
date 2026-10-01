import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTask } from "./useTask";
import { useJob } from "../client/pulpitCore/useJob";
import { contentSizeKeys } from "../client/pulpitCore/contentSize";
import { useTasksContext, type TrackedTask } from "./TasksContext";
import { TERMINAL_TASK_STATES } from "../client/tasks";

const TERMINAL_JOB_STATUSES = new Set(["success", "failed"]);

/**
 * Wraps useTask with the pulp-tasks skill's "invalidate on completion" rule:
 * once (and only once) a tracked task reaches "completed", invalidate the
 * query keys the caller registered it with, so the UI reflects Pulp's new
 * state without a manual refresh. Never fires for "failed"/"canceled" -
 * nothing succeeded, so there's nothing new to reflect.
 */
export function useTrackedTask(task: TrackedTask) {
  const query = useTask(task.href);
  const queryClient = useQueryClient();
  const { setTaskActive } = useTasksContext();
  const invalidatedRef = useRef(false);

  useEffect(() => {
    if (query.data?.state) {
      setTaskActive(task.href, !TERMINAL_TASK_STATES.has(query.data.state));
    }
  }, [query.data?.state, setTaskActive, task.href]);

  useEffect(() => {
    if (query.data?.state === "completed" && !invalidatedRef.current) {
      invalidatedRef.current = true;
      queryClient.invalidateQueries({ queryKey: contentSizeKeys.all });
      for (const queryKey of task.invalidateKeys ?? []) {
        queryClient.invalidateQueries({ queryKey });
      }
    }
  }, [query.data?.state, queryClient, task.invalidateKeys]);

  return query;
}

/** useTrackedTask for a pulpit-core job (`kind: "job"`, `href` = job id):
 * same invalidate-once-on-success rule. */
export function useTrackedJob(task: TrackedTask) {
  const query = useJob(task.href);
  const queryClient = useQueryClient();
  const { setTaskActive } = useTasksContext();
  const invalidatedRef = useRef(false);

  useEffect(() => {
    if (query.data?.status) {
      setTaskActive(task.href, !TERMINAL_JOB_STATUSES.has(query.data.status));
    }
  }, [query.data?.status, setTaskActive, task.href]);

  useEffect(() => {
    if (query.data?.status === "success" && !invalidatedRef.current) {
      invalidatedRef.current = true;
      for (const queryKey of task.invalidateKeys ?? []) {
        queryClient.invalidateQueries({ queryKey });
      }
    }
  }, [query.data?.status, queryClient, task.invalidateKeys]);

  return query;
}
