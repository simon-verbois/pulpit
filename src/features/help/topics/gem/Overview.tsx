import { Content } from "@patternfly/react-core";

export function GemOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Mirror or upload RubyGems packages. Create a remote and a repository, sync, then
        publish.
      </Content>
      <Content component="p">
        A distribution gives clients a download address. Publish again after content
        changes; there is no autopublish option.
      </Content>
    </Content>
  );
}
