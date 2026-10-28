import { Content } from "@patternfly/react-core";

export function TasksTopic() {
  return (
    <Content>
      <Content component="p">
        Syncs, publications and deletions run in the background. Open{" "}
        <strong>Tasks</strong> in the top bar to follow recent operations.
      </Content>
      <Content component="ul">
        <Content component="li">
          Use the sidebar's <strong>Tasks</strong> page for saved history. Filter by type
          or state, then choose <strong>View details</strong>.
        </Content>
        <Content component="li">
          If a sync fails, open its details, fix the reported problem and retry. Wait for{" "}
          <strong>completed</strong> before expecting new content.
        </Content>
        <Content component="li">
          Use <strong>Stop</strong> to cancel a waiting or running task.
        </Content>
      </Content>
      <Content component="p">
        Large syncs can run for hours. If downloads stop progressing, check the source and
        proxy.
      </Content>
      <Content component="p">
        History retention is set in{" "}
        <strong>Administration → General → Task history</strong>. Purged history cannot be
        recovered.
      </Content>
    </Content>
  );
}
