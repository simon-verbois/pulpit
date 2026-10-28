import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from "@patternfly/react-core";

import { PulpApiError } from "../../../api/errors/PulpApiError";
import { useJob } from "../../../api/client/pulpitCore/useJob";
import { usePurgeTaskHistoryMutation } from "./usePurgeTaskHistoryMutation";
import { ErrorState } from "../../../components/ErrorState";

/** Confirms, then runs, an immediate purge of finished Pulp tasks older than
 * the saved retention. Irreversible: the purged tasks are the audit trail. */
export function PurgeTaskHistoryModal({
  retentionDays,
  onClose,
}: {
  retentionDays: number;
  onClose: () => void;
}) {
  const purgeMutation = usePurgeTaskHistoryMutation();
  const job = useJob(purgeMutation.data?.id);

  const isRunning =
    purgeMutation.isPending ||
    (purgeMutation.isSuccess && !job.data) ||
    job.data?.status === "queued" ||
    job.data?.status === "running";
  const jobFailed = job.data?.status === "failed";
  const jobSucceeded = job.data?.status === "success";

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="purge-tasks-title" variant="small">
      <ModalHeader title="Purge task history?" labelId="purge-tasks-title" />
      <ModalBody>
        <Stack hasGutter>
          {purgeMutation.isError ? (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                title={
                  purgeMutation.error instanceof PulpApiError
                    ? purgeMutation.error.message
                    : "Could not queue the purge."
                }
              />
            </StackItem>
          ) : null}
          {jobFailed ? (
            <StackItem>
              <Alert variant="danger" isInline title="The purge failed">
                {job.data?.error}
              </Alert>
            </StackItem>
          ) : null}
          {job.isError ? (
            <StackItem>
              <ErrorState error={job.error} onRetry={() => job.refetch()} />
            </StackItem>
          ) : null}
          {jobSucceeded ? (
            <StackItem>
              <Alert variant="success" isInline title="Purge completed">
                Pulp finished deleting the old tasks.
              </Alert>
            </StackItem>
          ) : null}
          {!jobSucceeded ? (
            <StackItem>
              Every finished task (completed, failed, canceled or skipped) older than{" "}
              <strong>{retentionDays} days</strong> will be permanently deleted from Pulp.
              This cannot be undone.
            </StackItem>
          ) : null}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Flex
          justifyContent={{ default: "justifyContentFlexEnd" }}
          style={{ width: "100%" }}
        >
          <FlexItem>
            <Button variant="link" onClick={onClose}>
              {jobSucceeded ? "Close" : "Cancel"}
            </Button>
          </FlexItem>
          {!jobSucceeded ? (
            <FlexItem>
              <Button
                variant="danger"
                isLoading={isRunning}
                isDisabled={isRunning}
                onClick={() => purgeMutation.mutate()}
              >
                Purge
              </Button>
            </FlexItem>
          ) : null}
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
