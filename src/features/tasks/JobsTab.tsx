import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  FormSelect,
  FormSelectOption,
  Pagination,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import type { JobStatus } from "../../api/client/pulpitCore/types";
import { parseResourceRecord } from "../../api/client/taskResources";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { StatusIndicator } from "../../components/StatusIndicator";
import { usePulpPagination } from "../../hooks/usePulpPagination";
import { formatDuration } from "../../lib/duration";
import { formatRelativeTime } from "../../lib/relativeTime";
import { JobDetailModal } from "./JobDetailModal";
import { JOB_STATUS_COLOR, jobLabel } from "./jobLabel";
import { TaskResourceCell } from "./TaskResourceCell";
import { useJobsQuery } from "./useJobsQuery";
import { useTaskResources } from "./useTaskResources";

const STATUS_OPTIONS: { value: JobStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

/**
 * pulpit-core's own background jobs (re-signing, key publishing, LDAP
 * apply, ...) - work Pulp's task list never sees, since pulpit-core runs it
 * in its own worker. Staff see every job, anyone else only their own; the
 * periodic heartbeat jobs are left out server-side.
 *
 * `?job=<id>` opens that job's detail modal (the Tasks drawer links here).
 */
export function JobsTab() {
  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [searchParams, setSearchParams] = useSearchParams();
  const viewingJobId = searchParams.get("job");
  const pagination = usePulpPagination();

  const jobsQuery = useJobsQuery({
    limit: pagination.limit,
    offset: pagination.offset,
    status: statusFilter || undefined,
  });

  const rows = useMemo(
    () =>
      (jobsQuery.data?.results ?? []).map((job) => ({
        job,
        resource: job.repository_href
          ? (parseResourceRecord(job.repository_href) ?? undefined)
          : undefined,
      })),
    [jobsQuery.data],
  );
  const resourcesQuery = useTaskResources(
    rows.flatMap((row) => (row.resource ? [row.resource] : [])),
  );

  const setViewingJob = (jobId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (jobId) {
      next.set("job", jobId);
    } else {
      next.delete("job");
    }
    setSearchParams(next, { replace: true });
  };

  const toolbar = (
    <Toolbar>
      <ToolbarContent>
        <ToolbarItem>
          <FormSelect
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(_event, value) => setStatusFilter(value as JobStatus | "")}
          >
            {STATUS_OPTIONS.map((option) => (
              <FormSelectOption
                key={option.value}
                value={option.value}
                label={option.label}
              />
            ))}
          </FormSelect>
        </ToolbarItem>
        <ToolbarItem align={{ default: "alignEnd" }}>
          <Pagination
            itemCount={jobsQuery.data?.count ?? 0}
            page={pagination.page}
            perPage={pagination.perPage}
            perPageOptions={pagination.perPageOptions}
            onSetPage={pagination.onSetPage}
            onPerPageSelect={pagination.onPerPageSelect}
            isCompact
          />
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );

  const isEmpty = jobsQuery.isSuccess && jobsQuery.data.results.length === 0;

  return (
    <>
      {jobsQuery.isPending ? <LoadingState label="Loading background jobs" /> : null}
      {jobsQuery.isError ? (
        <ErrorState error={jobsQuery.error} onRetry={() => jobsQuery.refetch()} />
      ) : null}
      {isEmpty && statusFilter === "" ? (
        <EmptyState
          title="No background jobs found"
          body="Jobs appear here once Pulpit runs work of its own in the background, such as re-signing a repository."
        />
      ) : null}
      {isEmpty && statusFilter !== "" ? (
        <>
          {toolbar}
          <EmptyState
            variant="sm"
            title="No matching jobs"
            body="Try a different status filter."
          />
        </>
      ) : null}
      {jobsQuery.isSuccess && !isEmpty ? (
        <>
          {toolbar}
          <Table aria-label="Background jobs" variant="compact" gridBreakPoint="grid-lg">
            <Thead>
              <Tr>
                <Th>Job</Th>
                <Th>Resource</Th>
                <Th>Status</Th>
                <Th>Requested by</Th>
                <Th>Created</Th>
                <Th>Duration</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {rows.map(({ job, resource }) => (
                <Tr key={job.id} isRowSelected={viewingJobId === job.id}>
                  <Td dataLabel="Job">{jobLabel(job.job_type)}</Td>
                  <Td dataLabel="Resource">
                    <TaskResourceCell
                      resource={resource}
                      resolved={
                        resource ? resourcesQuery.data?.[resource.key] : undefined
                      }
                      isResolving={resourcesQuery.isPending}
                    />
                  </Td>
                  <Td dataLabel="Status">
                    <StatusIndicator color={JOB_STATUS_COLOR[job.status]} isCompact>
                      {job.status}
                    </StatusIndicator>
                  </Td>
                  <Td dataLabel="Requested by">{job.requested_by ?? "System"}</Td>
                  <Td dataLabel="Created">{formatRelativeTime(job.created_at)}</Td>
                  <Td dataLabel="Duration">
                    {job.started_at
                      ? formatDuration(job.started_at, job.finished_at ?? undefined)
                      : "—"}
                  </Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Button variant="link" onClick={() => setViewingJob(job.id)}>
                      View details
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      ) : null}

      {viewingJobId ? (
        <JobDetailModal
          jobId={viewingJobId}
          initialJob={rows.find((row) => row.job.id === viewingJobId)?.job}
          onClose={() => setViewingJob(null)}
        />
      ) : null}
    </>
  );
}
