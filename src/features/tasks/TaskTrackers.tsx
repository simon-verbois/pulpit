import { useTasksContext } from "../../api/tasks/TasksContext";
import { useTrackedTask } from "../../api/tasks/useTrackedTask";
import type { TrackedTask } from "../../api/tasks/TasksContext";

function TaskTracker({ task }: { task: TrackedTask }) {
  useTrackedTask(task);
  return null;
}

/**
 * Headless - drives task polling and cache invalidation regardless of
 * whether the Tasks drawer has ever been opened. PatternFly's
 * DrawerPanelContent only mounts its children once `isExpanded` first
 * becomes true (see node_modules/@patternfly/react-core .../DrawerPanelContent.js),
 * so relying on <TasksDrawer>'s own TaskListItem instances (rendered only
 * inside that panel) to invalidate queries meant a task registered before
 * the user ever opened the drawer was never polled, and its completion
 * never invalidated anything - render this alongside <TasksDrawer>, not
 * inside it, so tracking starts the moment a task is registered.
 */
export function TaskTrackers() {
  const { trackedTasks } = useTasksContext();
  return trackedTasks.map((task) => <TaskTracker key={task.href} task={task} />);
}
