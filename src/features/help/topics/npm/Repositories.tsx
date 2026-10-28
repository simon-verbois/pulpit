import { Content } from "@patternfly/react-core";

import { DistributionBasePathConvention } from "../DistributionBasePathConvention";

export function NpmRepositoriesTopic() {
  return (
    <Content>
      <Content component="ol">
        <Content component="li">
          Create a repository with a name and a default remote.
        </Content>
        <Content component="li">
          Choose <strong>Sync now</strong>, or use{" "}
          <strong>Content → Upload package</strong> and check the relative path.
        </Content>
        <Content component="li">
          Create a distribution under <strong>Distributions</strong> and copy its URL. No
          publish step is needed.
        </Content>
      </Content>
      <Content component="p">
        A distribution can also use a remote to cache downloads. Use{" "}
        <strong>Versions</strong> for snapshots and <strong>Access</strong> for
        permissions.
      </Content>
      <DistributionBasePathConvention prefix="npm" />
    </Content>
  );
}
