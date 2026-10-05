import { useState } from "react";
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
  Stack,
  StackItem,
  Title,
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
import { explainTaskFailure } from "./taskFailure";
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
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);
  const [isTechnicalExpanded, setIsTechnicalExpanded] = useState(false);
  const refs = taskResources(task);
  const resourcesQuery = useTaskResources(refs);
  const resolved = resourcesQuery.data ?? {};
  const failure = task.state === "failed" ? explainTaskFailure(task.error) : undefined;
  const rawRecords = [
    ...(task.reserved_resources_record ?? []),
    ...(task.created_resources ?? []),
  ];

  return (
    <>
      <ModalHeader>
        <Title
          headingLevel="h1"
          size="xl"
          id="task-detail-title"
          style={{ overflowWrap: "anywhere" }}
        >
          {taskTitle(
            task,
            resourcesQuery.isPending ? undefined : refs[0],
            refs[0] ? resolved[refs[0].key] : undefined,
          )}
        </Title>
      </ModalHeader>
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <DescriptionList isCompact columnModifier={{ default: "1Col", sm: "2Col" }}>
              <DescriptionListGroup>
                <DescriptionListTerm>State</DescriptionListTerm>
                <DescriptionListDescription>
                  <StatusIndicator color={TASK_STATE_COLOR[task.state]}>
                    {task.state}
                  </StatusIndicator>
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
              <DescriptionListGroup>
                <DescriptionListTerm>Created by</DescriptionListTerm>
                <DescriptionListDescription>
                  <CreatedByCell createdBy={task.created_by} />
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Started</DescriptionListTerm>
                <DescriptionListDescription>
                  <Timestamp value={task.started_at} />
                </DescriptionListDescription>
              </DescriptionListGroup>
              {task.finished_at ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Finished</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Timestamp value={task.finished_at} />
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
            </DescriptionList>
          </StackItem>
          {failure ? (
            <StackItem>
              <Alert variant="danger" isInline title={failure.title}>
                <Content component="p">{failure.explanation}</Content>
                {failure.file ? (
                  <Content component="p" style={{ overflowWrap: "anywhere" }}>
                    Affected package: <strong>{failure.file}</strong>
                  </Content>
                ) : null}
                <Content component="p">
                  <strong>What to do next: </strong>
                  {failure.nextStep}
                </Content>
                {task.name?.includes("synchroniz") ? (
                  <Content component="p">
                    This failed sync did not create a completed repository version.
                    Already downloaded files may remain in Pulp, but do not mean that
                    those packages are available in this repository.
                  </Content>
                ) : null}
                {task.error ? (
                  <ExpandableSection
                    toggleText="Technical error details"
                    isExpanded={isErrorExpanded}
                    onToggle={(_event, expanded) => setIsErrorExpanded(expanded)}
                  >
                    <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      {JSON.stringify(task.error, null, 2)}
                    </pre>
                  </ExpandableSection>
                ) : null}
              </Alert>
            </StackItem>
          ) : null}
          <StackItem>
            <TaskProgress
              reports={task.progress_reports}
              heading={<Content component="h3">Progress</Content>}
            />
          </StackItem>
          <StackItem>
            <ExpandableSection
              toggleText="Technical details"
              isExpanded={isTechnicalExpanded}
              onToggle={(_event, expanded) => setIsTechnicalExpanded(expanded)}
            >
              <Stack hasGutter style={{ overflowWrap: "anywhere" }}>
                <StackItem>
                  <DescriptionList isHorizontal isCompact>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Task function</DescriptionListTerm>
                      <DescriptionListDescription>
                        <code>{task.name ?? "—"}</code>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Created</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Timestamp value={task.pulp_created} />
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
                </StackItem>
                {refs.length > 0 ? (
                  <StackItem>
                    <Content component="h3">Resources</Content>
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
                  </StackItem>
                ) : null}
                {rawRecords.length > 0 ? (
                  <StackItem>
                    <Content component="h3">Raw resource records</Content>
                    <Content component="ul">
                      {rawRecords.map((record, index) => (
                        <Content component="li" key={`${index}-${record}`}>
                          <code>{record}</code>
                        </Content>
                      ))}
                    </Content>
                  </StackItem>
                ) : null}
              </Stack>
            </ExpandableSection>
          </StackItem>
        </Stack>
      </ModalBody>
    </>
  );
}
