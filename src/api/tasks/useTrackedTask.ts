import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTask } from "./useTask";
import { contentSizeKeys } from "../client/contentSizes";
import type { TrackedTask } from "./TasksContext";

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
  const invalidatedRef = useRef(false);

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
