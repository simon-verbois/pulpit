import { Button, Spinner, type ButtonProps } from "@patternfly/react-core";

import { useActiveTaskForResource } from "../api/tasks/TasksContext";

interface TaskActionButtonProps extends ButtonProps {
  resourceHref: string;
  taskAction: string;
}

/**
 * A PatternFly button that remains tied to the backend task it starts.
 *
 * React Query's mutation `isPending` only covers the initial HTTP request.
 * Pulp then continues asynchronously, often for minutes. This component
 * disables every action on the resource while that tracked task is active,
 * and keeps the spinner on the action that launched it until Pulp reports a
 * terminal state.
 */
export function TaskActionButton({
  resourceHref,
  taskAction,
  isDisabled,
  isLoading,
  className,
  icon,
  title,
  ...props
}: TaskActionButtonProps) {
  const activeTask = useActiveTaskForResource(resourceHref);
  const isBackendActionRunning = activeTask?.action === taskAction;
  const isActionRunning = Boolean(isLoading || isBackendActionRunning);
  const taskClassName = [
    "pulpit-task-action",
    isActionRunning ? "pulpit-task-action--running" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Button
      {...props}
      className={taskClassName}
      icon={isActionRunning ? <Spinner isInline aria-hidden="true" /> : icon}
      isDisabled={Boolean(isDisabled || activeTask)}
      title={activeTask?.label ?? title}
      aria-busy={isActionRunning || undefined}
    />
  );
}
