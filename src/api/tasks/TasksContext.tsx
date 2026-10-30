import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { QueryKey } from "@tanstack/react-query";

const MAX_TRACKED_TASKS = 20;

export interface TrackedTask {
  /** A Pulp task href - or, for `kind: "job"`, a pulpit-core job id. */
  href: string;
  /** "job": a pulpit-core background job (polled via /jobs/{id}, shown on
   * the Tasks page's "Background jobs" tab) rather than a Pulp task. */
  kind?: "pulp" | "job" | "group";
  /** Human label shown in the drawer/tasks page before the task itself reports a name. */
  label?: string;
  /** Query keys to invalidate once this task reaches "completed" - see useTrackedTask. */
  invalidateKeys?: QueryKey[];
  /** Refresh diagnostics even when a background job fails. */
  invalidateOnFailure?: boolean;
  /** Existing Pulp resources locked by this operation. Keeping this on the
   * tracked task lets every route disable duplicate/conflicting actions while
   * the backend task is still active. */
  resourceHrefs?: string[];
  /** Stable UI action key. The matching action keeps its spinner visible;
   * other actions on the same resource are disabled without extra spinners. */
  action?: string;
}

interface TasksContextValue {
  /** Tasks tracked this session, most recently registered first. */
  trackedTasks: TrackedTask[];
  /** Call after a mutation returns a task href, to start tracking it. */
  registerTask: (task: TrackedTask, preserveExisting?: boolean) => void;
  activeTaskHrefs: ReadonlySet<string>;
  setTaskActive: (href: string, active: boolean) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

function retainTasks(tasks: TrackedTask[], active: ReadonlySet<string>) {
  let completed = 0;
  return tasks.filter((task) => active.has(task.href) || completed++ < MAX_TRACKED_TASKS);
}

// Pulp remains authoritative. TaskRecovery re-discovers active server work
// after reload; no browser credentials or task history are persisted.
export function TasksProvider({ children }: { children: ReactNode }) {
  const [{ trackedTasks, activeTaskHrefs }, setTracking] = useState<{
    trackedTasks: TrackedTask[];
    activeTaskHrefs: ReadonlySet<string>;
  }>({ trackedTasks: [], activeTaskHrefs: new Set() });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const registerTask = useCallback((task: TrackedTask, preserveExisting = false) => {
    setTracking((current) => {
      const existing = current.trackedTasks.find((item) => item.href === task.href);
      const active = new Set(current.activeTaskHrefs).add(task.href);
      return {
        activeTaskHrefs: active,
        trackedTasks: retainTasks(
          [
            preserveExisting ? { ...task, ...existing } : { ...existing, ...task },
            ...current.trackedTasks.filter((item) => item.href !== task.href),
          ],
          active,
        ),
      };
    });
  }, []);

  const setTaskActive = useCallback((href: string, active: boolean) => {
    setTracking((current) => {
      if (current.activeTaskHrefs.has(href) === active) return current;
      const next = new Set(current.activeTaskHrefs);
      if (active) next.add(href);
      else next.delete(href);
      return {
        activeTaskHrefs: next,
        trackedTasks: retainTasks(current.trackedTasks, next),
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      trackedTasks,
      registerTask,
      activeTaskHrefs,
      setTaskActive,
      isDrawerOpen,
      setIsDrawerOpen,
    }),
    [trackedTasks, registerTask, activeTaskHrefs, setTaskActive, isDrawerOpen],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + accompanying hook is the standard pattern
export function useTasksContext(): TasksContextValue {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error("useTasksContext must be used within a TasksProvider");
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + accompanying hook is the standard pattern
export function useActiveTaskForResource(resourceHref: string): TrackedTask | undefined {
  const { trackedTasks, activeTaskHrefs } = useTasksContext();
  return trackedTasks.find(
    (task) =>
      activeTaskHrefs.has(task.href) && task.resourceHrefs?.includes(resourceHref),
  );
}
