import { Content } from "@patternfly/react-core";

export function TasksTopic() {
  return (
    <Content>
      <Content component="p">
        Actions like syncing a repository, publishing, deleting, or pruning packages don't
        finish instantly — Pulp runs them in the background as <strong>tasks</strong>.
      </Content>
      <Content component="h3">Watching progress</Content>
      <Content component="p">
        After you trigger one of these actions, click the bell-style{" "}
        <strong>Tasks</strong> icon in the top bar to see it listed with its real status:
        waiting, running, completed, failed, or canceled. This quick view only covers
        what's happened since you loaded the page — reloading clears it.
      </Content>
      <Content component="p">
        While an action is waiting or running, its button shows a spinner and the other
        actions for that same item are disabled. Wait for the task to finish before trying
        another action on it; this protection follows the item if you move between its
        list and detail pages.
      </Content>
      <Content component="h3">Full task history</Content>
      <Content component="p">
        The <strong>Tasks</strong> page in the sidebar is different — it's Pulp's own
        permanent record of every task, from any client. Filter by type (for example,
        <strong>Sync</strong> or <strong>Publish</strong>), state, and task name together.
        To find an active repository sync among recent publications, select
        <strong>Sync</strong> and <strong>Running</strong>. Changing a filter returns to
        the first page. Type and state filters are saved in the page URL, so you can
        bookmark or share the filtered view. Custom task names can be found with
        <strong>All types</strong> and the name search. Use <strong>View details</strong>{" "}
        on any row to see its state, duration, who triggered it, when it ran, and live
        progress. Failed tasks show an explanation of the reported error and what to check
        before retrying. Expand <strong>Technical details</strong> to find related
        resources, the task function, its href and correlation ID. These details are
        collapsed initially to keep the progress easy to read. Expand
        <strong>Technical error details</strong> for Pulp's original error, including a
        traceback when available. Give your administrator the task href and correlation ID
        to help locate its logs.
      </Content>
      <Content component="p">
        A failed sync does not create a completed repository version. Downloaded files may
        remain in Pulp while the repository still shows its previous contents. Fix the
        reported problem and rerun the sync; wait for <strong>completed</strong>
        before expecting the new packages to appear. A forcibly stopped worker can
        indicate a memory limit, but operating-system logs are needed to confirm it.
      </Content>
      <Content component="p">
        Large syncs can run for hours. In the reference Docker deployment, HTTP/HTTPS
        downloads have no total duration limit while data keeps arriving. A connection
        that stops receiving data times out after five minutes by default; a remote can
        use a different read inactivity timeout. Other downloads progressing do not reset
        that connection's timer. Your proxy or source may impose its own limits.
      </Content>
      <Content component="p">
        A waiting or running Pulp task also has a <strong>Stop</strong> action. Confirming
        it asks Pulp to cancel the work safely; the state may briefly show as canceling
        before it becomes canceled. If the task finishes first, Pulp reports the conflict
        and Pulpit leaves the task unchanged.
      </Content>
    </Content>
  );
}
