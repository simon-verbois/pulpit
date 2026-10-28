import { Content } from "@patternfly/react-core";

export function FileRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        Choose <strong>Standard</strong> for a file manifest URL, or <strong>Git</strong>{" "}
        for a Git repository and optional branch, tag or commit.
      </Content>
      <Content component="p">
        For standard remotes, Immediate downloads now; On demand downloads when requested;
        Streamed does not keep files. Leave saved passwords blank when editing to keep
        them.
      </Content>
    </Content>
  );
}
