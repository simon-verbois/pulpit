import { Button } from "@patternfly/react-core";
import { useTasksContext } from "../../api/tasks/TasksContext";

// onToggle lets AppShell close the Help panel whenever Tasks is toggled -
// both share Page's one notificationDrawer slot, so only one can be open.
export function TasksIndicator({ onToggle }: { onToggle?: () => void }) {
  const { isDrawerOpen, setIsDrawerOpen, activeTaskHrefs } = useTasksContext();
  const inFlight = activeTaskHrefs.size;

  return (
    <Button
      variant="plain"
      onClick={() => {
        setIsDrawerOpen(!isDrawerOpen);
        onToggle?.();
      }}
    >
      <span>Tasks</span>
      {inFlight > 0 ? <span className="pulpit-task-count">{inFlight} active</span> : null}
    </Button>
  );
}
