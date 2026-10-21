import { useState } from "react";
import {
  Alert,
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";

import type { PulpTask } from "../../api/client/tasks";
import { taskResources } from "../../api/client/taskResources";
import { PulpApiError } from "../../api/errors/PulpApiError";
import { useActiveTaskForResource } from "../../api/tasks/TasksContext";
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
import { TASK_TYPES } from "./taskTypes";
import { useRetrySyncMutation } from "./useRetrySyncMutation";
import { useTaskResources } from "./useTaskResources";

const SYNC_TASK_NAMES: ReadonlySet<string> = new Set(
  TASK_TYPES.find((type) => type.value === "sync")?.names,
);

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
        <TaskDetailContent task={task} onClose={onClose} />
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

function TaskDetailContent({ task, onClose }: { task: PulpTask; onClose: () => void }) {
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);
  const [isTechnicalExpanded, setIsTechnicalExpanded] = useState(false);
  const refs = taskResources(task);
  const resourcesQuery = useTaskResources(refs);
  const resolved = resourcesQuery.data ?? {};
  // A sync locks its repository exclusively and reads its remote shared;
  // re-running it needs both to still exist.
  const repositoryRef = refs.find((ref) => ref.kind === "repository" && ref.exclusive);
  const remoteRef = refs.find((ref) => ref.kind === "remote");
  const repository = repositoryRef ? resolved[repositoryRef.key] : undefined;
  const remote = remoteRef ? resolved[remoteRef.key] : undefined;
  const canRetrySync =
    task.state === "failed" &&
    SYNC_TASK_NAMES.has(task.name ?? "") &&
    repository !== undefined &&
    remote !== undefined;
  const retryMutation = useRetrySyncMutation();
  const activeSync = useActiveTaskForResource(repository?.pulp_href ?? "");
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
          {retryMutation.isSuccess ? (
            <StackItem>
              <Alert variant="success" isInline title="Sync restarted">
                A new sync of this repository is running. Follow its progress in the Tasks
                drawer.
              </Alert>
            </StackItem>
          ) : null}
          {retryMutation.isError ? (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                title={
                  retryMutation.error instanceof PulpApiError
                    ? retryMutation.error.message
                    : "Could not restart the sync."
                }
              />
            </StackItem>
          ) : null}
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
                    those packages are available in this repository. Retrying reuses them
                    instead of downloading them again.
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
      {canRetrySync ? (
        <ModalFooter>
          <Flex
            justifyContent={{ default: "justifyContentFlexEnd" }}
            style={{ width: "100%" }}
          >
            {retryMutation.isSuccess ? (
              <FlexItem>
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
              </FlexItem>
            ) : (
              <>
                <FlexItem>
                  <Button variant="link" onClick={onClose}>
                    Close
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="primary"
                    isLoading={retryMutation.isPending}
                    isDisabled={retryMutation.isPending || activeSync !== undefined}
                    onClick={() =>
                      retryMutation.mutate({
                        repositoryHref: repository.pulp_href,
                        remoteHref: remote.pulp_href,
                        name: repository.name ?? "repository",
                      })
                    }
                  >
                    Retry sync
                  </Button>
                </FlexItem>
              </>
            )}
          </Flex>
        </ModalFooter>
      ) : null}
    </>
  );
}
