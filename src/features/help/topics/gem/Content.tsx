import { Content } from "@patternfly/react-core";

export function GemContentTopic() {
  return (
    <Content>
      <Content component="p">
        Search gems across all repositories. Click a repository name to open it.
      </Content>
      <Content component="p">
        Upload new <code>.gem</code> files from a repository's <strong>Content</strong>{" "}
        tab.
      </Content>
    </Content>
  );
}
