import { Content } from "@patternfly/react-core";

export function GemRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        Choose <strong>Create remote</strong> and enter a name and a RubyGems source URL.
      </Content>
      <Content component="p">
        Immediate downloads now; On demand downloads when requested; Streamed does not
        keep files. Add credentials if the source requires login.
      </Content>
    </Content>
  );
}
