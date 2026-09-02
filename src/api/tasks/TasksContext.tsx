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
  href: string;
  /** Human label shown in the drawer/tasks page before the task itself reports a name. */
  label?: string;
  /** Query keys to invalidate once this task reaches "completed" - see useTrackedTask. */
  invalidateKeys?: QueryKey[];
}

interface TasksContextValue {
  /** Tasks tracked this session, most recently registered first. */
  trackedTasks: TrackedTask[];
  /** Call after a mutation returns a task href, to start tracking it. */
  registerTask: (task: TrackedTask) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

// Ephemeral, in-memory only (docs/ARCHITECTURE.md: Pulpit holds no
// persistent state of its own) - a page reload simply stops tracking
// whatever was in-flight; the tasks themselves still exist in Pulp.
export function TasksProvider({ children }: { children: ReactNode }) {
  const [trackedTasks, setTrackedTasks] = useState<TrackedTask[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const registerTask = useCallback((task: TrackedTask) => {
    setTrackedTasks((current) =>
      [task, ...current.filter((t) => t.href !== task.href)].slice(0, MAX_TRACKED_TASKS),
    );
  }, []);

  const value = useMemo(
    () => ({ trackedTasks, registerTask, isDrawerOpen, setIsDrawerOpen }),
    [trackedTasks, registerTask, isDrawerOpen],
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
