import { Content } from "@patternfly/react-core";

export function AnsibleSearchTopic() {
  return (
    <Content>
      <Content component="p">
        Search for a collection version without opening each repository. Results show
        whether it is signed, deprecated or the highest available version.
      </Content>
      <Content component="p">
        Search may show only one repository holding a version. Open a repository's{" "}
        <strong>Collections</strong> tab to confirm its contents.
      </Content>
    </Content>
  );
}
