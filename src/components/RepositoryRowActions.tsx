import { Flex, FlexItem, MenuToggle, Spinner } from "@patternfly/react-core";
import { ActionsColumn, type IAction } from "@patternfly/react-table";

import { useActiveTaskForResource } from "../api/tasks/TasksContext";
import { TaskActionButton } from "./TaskActionButton";
import { UiIcon } from "./icons/UiIcon";

interface RowAction {
  onClick: () => void;
  isDisabled?: boolean;
  /** Explains why the action is disabled, or adds context to it. */
  title?: string;
}

interface RepositoryRowActionsProps {
  repositoryName: string;
  resourceHref: string;
  /** Rendered inline - the most frequent row action. Omitted for plugins without sync. */
  sync?: RowAction;
  /** Omitted for plugins without a publication step. */
  publish?: RowAction;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Row actions for a repositories table, following PatternFly's table
 * guidance: the most frequent action (Sync) stays inline, everything else
 * goes in a kebab menu with the destructive action last, behind a separator.
 *
 * Like `TaskActionButton`, every action is disabled while a Pulp task is
 * running against the repository; the kebab toggle shows a spinner when that
 * task was launched from the menu (Sync shows its own).
 */
export function RepositoryRowActions({
  repositoryName,
  resourceHref,
  sync,
  publish,
  onEdit,
  onDelete,
}: RepositoryRowActionsProps) {
  const activeTask = useActiveTaskForResource(resourceHref);
  const isMenuTaskRunning = Boolean(activeTask && activeTask.action !== "sync");

  const items: IAction[] = [
    { itemKey: "edit", title: "Edit", onClick: onEdit, isDisabled: Boolean(activeTask) },
  ];
  if (publish) {
    items.push({
      itemKey: "publish",
      title: "Publish",
      description: publish.title,
      onClick: publish.onClick,
      isDisabled: Boolean(publish.isDisabled || activeTask),
    });
  }
  items.push(
    { itemKey: "separator", isSeparator: true },
    {
      itemKey: "delete",
      title: "Delete",
      onClick: onDelete,
      isDanger: true,
      isDisabled: Boolean(activeTask),
    },
  );

  return (
    <Flex
      flexWrap={{ default: "nowrap" }}
      spaceItems={{ default: "spaceItemsNone" }}
      justifyContent={{ default: "justifyContentFlexEnd" }}
      alignItems={{ default: "alignItemsCenter" }}
    >
      {sync ? (
        <FlexItem>
          <TaskActionButton
            resourceHref={resourceHref}
            taskAction="sync"
            variant="link"
            isDisabled={sync.isDisabled}
            title={sync.title}
            onClick={sync.onClick}
          >
            Sync
          </TaskActionButton>
        </FlexItem>
      ) : null}
      <FlexItem>
        <ActionsColumn
          items={items}
          actionsToggle={({ onToggle, isOpen, isDisabled, toggleRef }) => (
            <MenuToggle
              ref={toggleRef}
              variant="plain"
              aria-label={`Actions for ${repositoryName}`}
              title={isMenuTaskRunning ? activeTask?.label : undefined}
              aria-busy={isMenuTaskRunning || undefined}
              onClick={onToggle}
              isExpanded={isOpen}
              isDisabled={isDisabled}
              icon={
                isMenuTaskRunning ? (
                  <Spinner isInline aria-hidden="true" />
                ) : (
                  <UiIcon name="kebab" strokeWidth={3} />
                )
              }
            />
          )}
        />
      </FlexItem>
    </Flex>
  );
}
