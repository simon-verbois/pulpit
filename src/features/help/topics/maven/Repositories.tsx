import { Content } from "@patternfly/react-core";

import { DistributionBasePathConvention } from "../DistributionBasePathConvention";

export function MavenRepositoriesTopic() {
  return (
    <Content>
      <Content component="ol">
        <Content component="li">
          Choose <strong>Create repository</strong> and enter a name.
        </Content>
        <Content component="li">
          Under <strong>Content → Upload artifact</strong>, choose a file and its Maven
          path, such as <code>com/example/app/1.0/app-1.0.jar</code>.
        </Content>
        <Content component="li">
          Create a distribution under <strong>Distributions</strong>. It serves uploaded
          artifacts immediately and can also cache a remote.
        </Content>
      </Content>
      <Content component="p">
        No sync or publish step is needed. Use <strong>Versions</strong> for snapshots and{" "}
        <strong>Access</strong> for permissions.
      </Content>
      <DistributionBasePathConvention prefix="maven" />
    </Content>
  );
}
