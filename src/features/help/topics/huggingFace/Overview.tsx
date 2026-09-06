import { Content } from "@patternfly/react-core";

export function HuggingFaceOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Use this area to manage content mirrored from the Hugging Face Hub: models,
        datasets, and spaces.
      </Content>
      <Content component="p">
        The usual shape of things: create a <strong>remote</strong> pointing at a Hub
        repo, create a <strong>repository</strong> that uses it as its default, then{" "}
        <strong>sync</strong>. Unlike RPM/File, this plugin has no autopublish - a{" "}
        <strong>distribution</strong> only serves what you explicitly{" "}
        <strong>publish</strong>.
      </Content>
      <Content component="p">
        Use the pages on the left for the details of each part -{" "}
        <strong>Repositories</strong> for the full repository lifecycle,{" "}
        <strong>Content</strong> to browse files across every repository at once, and{" "}
        <strong>Remotes</strong> for sync sources.
      </Content>
    </Content>
  );
}
