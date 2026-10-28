import { Content } from "@patternfly/react-core";

export function FileContentTopic() {
  return (
    <Content>
      <Content component="p">
        Search files by their relative path across all repositories. Click a repository
        name to open it.
      </Content>
      <Content component="p">
        To add a file, open that repository's <strong>Content → Upload file</strong>{" "}
        action.
      </Content>
    </Content>
  );
}
