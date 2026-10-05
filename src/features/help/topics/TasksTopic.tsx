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
        permanent record of every task, from any client, filterable by state or name. Use{" "}
        <strong>View details</strong> on any row to see who triggered it, exactly when it
        ran, which resources it touched, and — for a failed task — Pulp's actual error
        message instead of just "something failed."
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
