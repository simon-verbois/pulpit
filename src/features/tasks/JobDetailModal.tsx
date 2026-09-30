import {
  Alert,
  CodeBlock,
  CodeBlockCode,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Modal,
  ModalBody,
  ModalHeader,
} from "@patternfly/react-core";

import type { Job } from "../../api/client/pulpitCore/types";
import { useJob } from "../../api/client/pulpitCore/useJob";
import { parseResourceRecord } from "../../api/client/taskResources";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { StatusIndicator } from "../../components/StatusIndicator";
import { formatDuration } from "../../lib/duration";
import { JOB_STATUS_COLOR, jobLabel } from "./jobLabel";
import { TaskResourceCell } from "./TaskResourceCell";
import { useTaskResources } from "./useTaskResources";

function Timestamp({ value }: { value?: string | null }) {
  return <>{value ? new Date(value).toLocaleString() : "—"}</>;
}

/** A pulpit-core job's detail - fetched (and polled while it runs) by id,
 * like TaskDetailModal, so it works for a job linked from the Tasks drawer
 * that isn't on the current history page. */
export function JobDetailModal({
  jobId,
  initialJob,
  onClose,
}: {
  jobId: string;
  initialJob?: Job;
  onClose: () => void;
}) {
  const query = useJob(jobId);
  const job = query.data ?? initialJob;

  return (
    <Modal isOpen onClose={onClose} aria-labelledby="job-detail-title" variant="medium">
      {job ? (
        <JobDetailContent job={job} />
      ) : (
        <>
          <ModalHeader title="Background job" labelId="job-detail-title" />
          <ModalBody>
            {query.isError ? (
              <ErrorState error={query.error} onRetry={() => query.refetch()} />
            ) : (
              <LoadingState label="Loading job" />
            )}
          </ModalBody>
        </>
      )}
    </Modal>
  );
}

function JobDetailContent({ job }: { job: Job }) {
  const resource = job.repository_href
    ? (parseResourceRecord(job.repository_href) ?? undefined)
    : undefined;
  const resourcesQuery = useTaskResources(resource ? [resource] : []);

  return (
    <>
      <ModalHeader
        title={jobLabel(job.job_type)}
        description={job.job_type}
        labelId="job-detail-title"
      />
      <ModalBody>
        {job.status === "failed" && job.error ? (
          <Alert
            variant="danger"
            isInline
            title="Job failed"
            style={{ marginBottom: "1rem" }}
          >
            {job.error}
          </Alert>
        ) : null}
        <DescriptionList isHorizontal>
          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription>
              <StatusIndicator color={JOB_STATUS_COLOR[job.status]}>
                {job.status}
              </StatusIndicator>
            </DescriptionListDescription>
          </DescriptionListGroup>
          {resource ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Resource</DescriptionListTerm>
              <DescriptionListDescription>
                <TaskResourceCell
                  resource={resource}
                  resolved={resourcesQuery.data?.[resource.key]}
                  isResolving={resourcesQuery.isPending}
                />
              </DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
          <DescriptionListGroup>
            <DescriptionListTerm>Requested by</DescriptionListTerm>
            <DescriptionListDescription>
              {job.requested_by ?? "System"}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Created</DescriptionListTerm>
            <DescriptionListDescription>
              <Timestamp value={job.created_at} />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Started</DescriptionListTerm>
            <DescriptionListDescription>
              <Timestamp value={job.started_at} />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Finished</DescriptionListTerm>
            <DescriptionListDescription>
              <Timestamp value={job.finished_at} />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Duration</DescriptionListTerm>
            <DescriptionListDescription>
              {job.started_at
                ? formatDuration(job.started_at, job.finished_at ?? undefined)
                : "—"}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Attempts</DescriptionListTerm>
            <DescriptionListDescription>{job.attempts}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>ID</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{job.id}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        {job.result ? (
          <>
            <Content component="h4" style={{ marginTop: "1rem" }}>
              Result
            </Content>
            <CodeBlock>
              <CodeBlockCode>{JSON.stringify(job.result, null, 2)}</CodeBlockCode>
            </CodeBlock>
          </>
        ) : null}
      </ModalBody>
    </>
  );
}
