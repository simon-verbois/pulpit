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
  kind?: "pulp" | "job";
  /** Human label shown in the drawer/tasks page before the task itself reports a name. */
  label?: string;
  /** Query keys to invalidate once this task reaches "completed" - see useTrackedTask. */
  invalidateKeys?: QueryKey[];
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
  registerTask: (task: TrackedTask) => void;
  activeTaskHrefs: ReadonlySet<string>;
  setTaskActive: (href: string, active: boolean) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

// Ephemeral, in-memory only (docs/ARCHITECTURE.md: Pulpit holds no
// persistent state of its own) - a page reload simply stops tracking
// whatever was in-flight; the tasks themselves still exist in Pulp.
export function TasksProvider({ children }: { children: ReactNode }) {
  const [trackedTasks, setTrackedTasks] = useState<TrackedTask[]>([]);
  const [activeTaskHrefs, setActiveTaskHrefs] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const registerTask = useCallback((task: TrackedTask) => {
    setTrackedTasks((current) =>
      [task, ...current.filter((t) => t.href !== task.href)].slice(0, MAX_TRACKED_TASKS),
    );
    setActiveTaskHrefs((current) => new Set(current).add(task.href));
  }, []);

  const setTaskActive = useCallback((href: string, active: boolean) => {
    setActiveTaskHrefs((current) => {
      if (current.has(href) === active) return current;
      const next = new Set(current);
      if (active) next.add(href);
      else next.delete(href);
      return next;
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
