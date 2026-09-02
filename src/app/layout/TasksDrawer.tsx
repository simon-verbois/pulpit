import {
  NotificationDrawer,
  NotificationDrawerBody,
  NotificationDrawerHeader,
  NotificationDrawerList,
} from "@patternfly/react-core";

import { useTasksContext } from "../../api/tasks/TasksContext";
import { EmptyState } from "../../components/EmptyState";
import { TaskListItem } from "../../features/tasks/TaskListItem";

export function TasksDrawer() {
  const { trackedTasks, setIsDrawerOpen } = useTasksContext();

  return (
    <NotificationDrawer>
      <NotificationDrawerHeader
        title="Tasks"
        count={trackedTasks.length}
        onClose={() => setIsDrawerOpen(false)}
      />
      <NotificationDrawerBody>
        {trackedTasks.length === 0 ? (
          <EmptyState
            title="No tasks tracked yet"
            body="Tasks appear here once you trigger an asynchronous Pulp operation, such as a repository sync."
          />
        ) : (
          <NotificationDrawerList aria-label="Recent Pulp tasks">
            {trackedTasks.map((task) => (
              <TaskListItem key={task.href} task={task} />
            ))}
          </NotificationDrawerList>
        )}
      </NotificationDrawerBody>
    </NotificationDrawer>
  );
}
