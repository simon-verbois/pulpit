import {
  Alert,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
} from "@patternfly/react-core";

import type { PulpTask } from "../../api/client/tasks";
import { CreatedByCell } from "./CreatedByCell";
import { TASK_STATE_COLOR } from "./taskStateColor";

function Timestamp({ value }: { value?: string | null }) {
  return <>{value ? new Date(value).toLocaleString() : "—"}</>;
}

export function TaskDetailModal({
  task,
  onClose,
}: {
  task: PulpTask;
  onClose: () => void;
}) {
  const resources = [
    ...(task.reserved_resources_record ?? []),
    ...(task.created_resources ?? []),
  ];

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="task-detail-title" variant="medium">
      <ModalHeader title={task.name ?? "Pulp task"} labelId="task-detail-title" />
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
              <Label color={TASK_STATE_COLOR[task.state]}>{task.state}</Label>
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

        {resources.length > 0 ? (
          <>
            <Content component="h4" style={{ marginTop: "1rem" }}>
              Affected resources
            </Content>
            <Content component="ul">
              {resources.map((resource) => (
                <Content component="li" key={resource}>
                  <code>{resource}</code>
                </Content>
              ))}
            </Content>
          </>
        ) : null}
      </ModalBody>
    </Modal>
  );
}
