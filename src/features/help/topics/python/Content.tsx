import { Content } from "@patternfly/react-core";

export function PythonContentTopic() {
  return (
    <Content>
      <Content component="p">
        Search Python packages across all repositories. Click a repository name to open
        it.
      </Content>
      <Content component="p">
        To upload a wheel or source package, open that repository's{" "}
        <strong>Content</strong> tab.
      </Content>
    </Content>
  );
}
