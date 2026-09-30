import {
  Alert,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Modal,
  ModalBody,
  ModalHeader,
} from "@patternfly/react-core";

import type { PulpTask } from "../../api/client/tasks";
import { taskResources } from "../../api/client/taskResources";
import { useTask } from "../../api/tasks/useTask";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { StatusIndicator } from "../../components/StatusIndicator";
import { formatDuration } from "../../lib/duration";
import { CreatedByCell } from "./CreatedByCell";
import { taskTitle } from "./taskDescription";
import { TaskProgress } from "./TaskProgress";
import { TaskResourceCell } from "./TaskResourceCell";
import { TASK_STATE_COLOR } from "./taskStateColor";
import { useTaskResources } from "./useTaskResources";

function Timestamp({ value }: { value?: string | null }) {
  return <>{value ? new Date(value).toLocaleString() : "—"}</>;
}

/**
 * Fetches (and, while it runs, polls) the task by `href` itself, so it
 * works for a task linked from the Tasks drawer that isn't on the current
 * history page and a running sync/publish/sign advances here live;
 * `initialTask` - the history row, when there is one - just avoids an
 * empty first render.
 */
export function TaskDetailModal({
  href,
  initialTask,
  onClose,
}: {
  href: string;
  initialTask?: PulpTask;
  onClose: () => void;
}) {
  const query = useTask(href);
  const task = query.data ?? initialTask;

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="task-detail-title" variant="medium">
      {task ? (
        <TaskDetailContent task={task} />
      ) : (
        <>
          <ModalHeader title="Pulp task" labelId="task-detail-title" />
          <ModalBody>
            {query.isError ? (
              <ErrorState error={query.error} onRetry={() => query.refetch()} />
            ) : (
              <LoadingState label="Loading task" />
            )}
          </ModalBody>
        </>
      )}
    </Modal>
  );
}

function TaskDetailContent({ task }: { task: PulpTask }) {
  const refs = taskResources(task);
  const resourcesQuery = useTaskResources(refs);
  const resolved = resourcesQuery.data ?? {};
  const rawRecords = [
    ...(task.reserved_resources_record ?? []),
    ...(task.created_resources ?? []),
  ];

  return (
    <>
      <ModalHeader
        title={taskTitle(task, refs[0], refs[0] ? resolved[refs[0].key] : undefined)}
        description={task.name}
        labelId="task-detail-title"
      />
      <ModalBody>
        {task.state === "failed" && task.error?.description ? (
          <Alert
            variant="danger"
            isInline
            title="Task failed"
            style={{ marginBottom: "1rem" }}
          >
            {task.error.description}
          </Alert>
        ) : null}
        <DescriptionList isHorizontal>
          <DescriptionListGroup>
            <DescriptionListTerm>State</DescriptionListTerm>
            <DescriptionListDescription>
              <StatusIndicator color={TASK_STATE_COLOR[task.state]}>
                {task.state}
              </StatusIndicator>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Created by</DescriptionListTerm>
            <DescriptionListDescription>
              <CreatedByCell createdBy={task.created_by} />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Created</DescriptionListTerm>
            <DescriptionListDescription>
              <Timestamp value={task.pulp_created} />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Started</DescriptionListTerm>
            <DescriptionListDescription>
              <Timestamp value={task.started_at} />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Finished</DescriptionListTerm>
            <DescriptionListDescription>
              <Timestamp value={task.finished_at} />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Duration</DescriptionListTerm>
            <DescriptionListDescription>
              {task.started_at
                ? formatDuration(task.started_at, task.finished_at ?? undefined)
                : "—"}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {task.logging_cid ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Correlation ID</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{task.logging_cid}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
          <DescriptionListGroup>
            <DescriptionListTerm>Href</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{task.pulp_href}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        <TaskProgress
          reports={task.progress_reports}
          heading={
            <Content component="h4" style={{ marginTop: "1rem" }}>
              Progress
            </Content>
          }
        />

        {refs.length > 0 ? (
          <>
            <Content component="h4" style={{ marginTop: "1rem" }}>
              Resources
            </Content>
            <Content component="ul">
              {refs.map((ref) => (
                <Content component="li" key={ref.key}>
                  <TaskResourceCell
                    resource={ref}
                    resolved={resolved[ref.key]}
                    isResolving={resourcesQuery.isPending}
                  />
                </Content>
              ))}
            </Content>
          </>
        ) : null}

        {rawRecords.length > 0 ? (
          <ExpandableSection
            toggleText="Raw resource records"
            style={{ marginTop: "1rem" }}
          >
            <Content component="ul">
              {rawRecords.map((record, index) => (
                <Content component="li" key={`${index}-${record}`}>
                  <code>{record}</code>
                </Content>
              ))}
            </Content>
          </ExpandableSection>
        ) : null}
      </ModalBody>
    </>
  );
}
