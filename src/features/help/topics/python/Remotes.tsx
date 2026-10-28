import { Content } from "@patternfly/react-core";

export function PythonRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        Choose <strong>Create remote</strong>, enter a name and a package index URL, such
        as <code>https://pypi.org/simple/</code>.
      </Content>
      <Content component="p">
        Immediate downloads now; On demand downloads when requested; Streamed does not
        keep files. Add credentials if the source requires login.
      </Content>
    </Content>
  );
}
