import { Content } from "@patternfly/react-core";

export function RpmPackagesTopic() {
  return (
    <Content>
      <Content component="p">
        Search packages across all repositories. Click a repository name to open it.
      </Content>
      <Content component="p">
        To upload an RPM or see one repository's packages, open its{" "}
        <strong>Packages</strong> tab.
      </Content>
    </Content>
  );
}
