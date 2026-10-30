import { Alert, Button } from "@patternfly/react-core";
import { useTask } from "../../api/tasks/useTask";
import { ErrorState } from "../../components/ErrorState";
import { TaskProgress } from "./TaskProgress";

export function TaskGroupNotice({
  href,
  onClear,
}: {
  href: string;
  onClear: () => void;
}) {
  const query = useTask(href, true);
  return (
    <>
      <Alert
        isInline
        variant={query.data?.state === "failed" ? "danger" : "info"}
        title={`Task group: ${query.data?.state ?? "loading"}`}
        actionLinks={
          <Button variant="link" onClick={onClear}>
            Show all tasks
          </Button>
        }
      >
        This list shows every task in this operation. The group finishes after all
        children and dispatch have finished.
        {query.data?.error?.description ? <p>{query.data.error.description}</p> : null}
        <TaskProgress reports={query.data?.progress_reports} />
      </Alert>
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : null}
    </>
  );
}
