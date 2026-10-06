import { useState } from "react";
import {
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  MenuToggle,
  Spinner,
} from "@patternfly/react-core";

import { useActiveTaskForResource } from "../api/tasks/TasksContext";
import { TaskActionButton } from "./TaskActionButton";

export interface RepositoryHeaderAction {
  key: string;
  label: string;
  onClick: () => void;
  isDisabled?: boolean;
  /** Spinner on the Actions toggle while the request that starts it is in flight. */
  isLoading?: boolean;
  /** Explains why the action is disabled, or adds context to it. */
  description?: string;
}

interface RepositoryHeaderActionsProps {
  resourceHref: string;
  /** The page's one primary action. Omitted for plugins without sync. */
  sync?: Omit<RepositoryHeaderAction, "key" | "label">;
  /** Listed between Edit and Delete in the Actions menu (Publish, Re-sign, …). */
  actions?: RepositoryHeaderAction[];
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Page-header actions for a repository detail page, following PatternFly's
 * actions guidance: one primary action (Sync now) and every other page-wide
 * action grouped in an "Actions" dropdown, the destructive one last behind a
 * separator.
 *
 * Like `TaskActionButton`, every action is disabled while a Pulp task is
 * running against the repository; the Actions toggle shows a spinner when
 * that task was launched from the menu (Sync now shows its own).
 */
export function RepositoryHeaderActions({
  resourceHref,
  sync,
  actions = [],
  onEdit,
  onDelete,
}: RepositoryHeaderActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeTask = useActiveTaskForResource(resourceHref);
  const isMenuTaskRunning = Boolean(
    (activeTask && activeTask.action !== "sync") || actions.some((a) => a.isLoading),
  );

  const select = (onClick: () => void) => () => {
    setIsOpen(false);
    onClick();
  };

  return (
    <Flex spaceItems={{ default: "spaceItemsSm" }} flexWrap={{ default: "nowrap" }}>
      {sync ? (
        <FlexItem>
          <TaskActionButton
            resourceHref={resourceHref}
            taskAction="sync"
            isDisabled={sync.isDisabled}
            isLoading={sync.isLoading}
            title={sync.description}
            onClick={sync.onClick}
          >
            Sync now
          </TaskActionButton>
        </FlexItem>
      ) : null}
      <FlexItem>
        <Dropdown
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          popperProps={{ position: "right" }}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              onClick={() => setIsOpen((open) => !open)}
              isExpanded={isOpen}
              title={isMenuTaskRunning ? activeTask?.label : undefined}
              aria-busy={isMenuTaskRunning || undefined}
              icon={
                isMenuTaskRunning ? <Spinner isInline aria-hidden="true" /> : undefined
              }
            >
              Actions
            </MenuToggle>
          )}
        >
          <DropdownList>
            <DropdownItem
              key="edit"
              isDisabled={Boolean(activeTask)}
              onClick={select(onEdit)}
            >
              Edit
            </DropdownItem>
            {actions.map((action) => (
              <DropdownItem
                key={action.key}
                description={action.description}
                isDisabled={Boolean(action.isDisabled || action.isLoading || activeTask)}
                onClick={select(action.onClick)}
              >
                {action.label}
              </DropdownItem>
            ))}
            <Divider component="li" key="separator" />
            <DropdownItem
              key="delete"
              isDanger
              isDisabled={Boolean(activeTask)}
              onClick={select(onDelete)}
            >
              Delete repository
            </DropdownItem>
          </DropdownList>
        </Dropdown>
      </FlexItem>
    </Flex>
  );
}
