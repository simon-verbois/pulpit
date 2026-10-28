import { Link } from "react-router-dom";
import { Alert, Content, PageSection } from "@patternfly/react-core";

import { taskIdFromHref } from "../../api/client/tasks";
import { formatRelativeTime } from "../../lib/relativeTime";
import { explainTaskFailure } from "./taskFailure";
import { useLatestSyncTaskQuery } from "./useLatestSyncTaskQuery";
import { ErrorState } from "../../components/ErrorState";

/** Shown on a repository page when its most recent sync failed, so the
 * problem is visible without opening the task. Disappears once a later
 * sync succeeds (the newest sync task is then no longer failed). */
export function LatestSyncFailureAlert({ repositoryHref }: { repositoryHref: string }) {
  const query = useLatestSyncTaskQuery(repositoryHref);
  if (query.isError) {
    return (
      <PageSection hasBodyWrapper={false}>
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </PageSection>
    );
  }
  const task = query.data;
  if (!task || task.state !== "failed") return null;

  const failure = explainTaskFailure(task.error);
  return (
    <PageSection hasBodyWrapper={false}>
      <Alert
        variant="danger"
        isInline
        title={`Last sync failed: ${failure.title}`}
        style={{ marginBottom: "var(--pf-t--global--spacer--md)" }}
      >
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
        <Content component="p">
          {task.finished_at ? `${formatRelativeTime(task.finished_at)} · ` : null}
          <Link to={`/tasks?task=${taskIdFromHref(task.pulp_href)}`}>
            View task details
          </Link>
        </Content>
      </Alert>
    </PageSection>
  );
}
