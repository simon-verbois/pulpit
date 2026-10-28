import { Content } from "@patternfly/react-core";

import { DistributionBasePathConvention } from "../DistributionBasePathConvention";

export function PythonRepositoriesTopic() {
  return (
    <Content>
      <Content component="ol">
        <Content component="li">
          Create a repository with a name and a default remote.
        </Content>
        <Content component="li">
          Choose <strong>Sync now</strong>, or upload a wheel or source package from{" "}
          <strong>Content</strong>. Check its relative path.
        </Content>
        <Content component="li">
          Choose <strong>Publish now</strong>. Autopublish is off by default.
        </Content>
        <Content component="li">
          Create a distribution under <strong>Distributions</strong> and copy its URL.
        </Content>
      </Content>
      <Content component="p">
        Use <strong>Versions</strong> for snapshots and <strong>Access</strong> for
        permissions.
      </Content>
      <DistributionBasePathConvention prefix="python" />
    </Content>
  );
}
