import { Content } from "@patternfly/react-core";

export function NpmContentTopic() {
  return (
    <Content>
      <Content component="p">
        Search NPM packages across all repositories. Click a repository name to open it.
      </Content>
      <Content component="p">
        To upload a package or see one repository's contents, open its{" "}
        <strong>Content</strong> tab.
      </Content>
    </Content>
  );
}
