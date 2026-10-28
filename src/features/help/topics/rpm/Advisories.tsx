import { Content } from "@patternfly/react-core";

export function RpmAdvisoriesTopic() {
  return (
    <Content>
      <Content component="p">
        Search security, bugfix and enhancement advisories across all repositories.
      </Content>
      <Content component="p">
        Advisories usually arrive with a sync. To add one manually, use a repository's{" "}
        <strong>Advisories → Upload advisory</strong> action. Upload advisory JSON;{" "}
        <code>updateinfo.xml</code> is not accepted here.
      </Content>
    </Content>
  );
}
