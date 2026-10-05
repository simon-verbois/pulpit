import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";

import type { PulpTask } from "../../api/client/tasks";
import { PulpApiError } from "../../api/errors/PulpApiError";
import { taskActionLabel } from "./humanizeTaskName";
import { useCancelTaskMutation } from "./useCancelTaskMutation";

export function CancelTaskModal({
  task,
  onClose,
}: {
  task: PulpTask;
  onClose: () => void;
}) {
  const mutation = useCancelTaskMutation();
  const label = task.name ? taskActionLabel(task.name) : "this task";

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="cancel-task-title" variant="small">
      <ModalHeader title="Stop task?" labelId="cancel-task-title" />
      <ModalBody>
        {mutation.isError ? (
          <Alert
            variant="danger"
            isInline
            title={
              mutation.error instanceof PulpApiError
                ? mutation.error.message
                : "Could not stop the task."
            }
            style={{ marginBottom: "1rem" }}
          />
        ) : null}
        Stop <strong>{label}</strong>? Pulp will cancel it as soon as the running work can
        safely stop.
      </ModalBody>
      <ModalFooter>
        <Flex
          justifyContent={{ default: "justifyContentFlexEnd" }}
          style={{ width: "100%" }}
        >
          <FlexItem>
            <Button variant="link" onClick={onClose} isDisabled={mutation.isPending}>
              Cancel
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="danger"
              isLoading={mutation.isPending}
              isDisabled={mutation.isPending}
              onClick={() => mutation.mutate(task, { onSuccess: onClose })}
            >
              Stop task
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
