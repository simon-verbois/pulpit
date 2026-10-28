import { Content } from "@patternfly/react-core";

import { DistributionBasePathConvention } from "../DistributionBasePathConvention";

export function HuggingFaceRepositoriesTopic() {
  return (
    <Content>
      <Content component="ol">
        <Content component="li">
          Create a repository with a name and a default remote.
        </Content>
        <Content component="li">
          Choose <strong>Sync now</strong>. For manual uploads, use{" "}
          <strong>Content → Upload file</strong> and enter a relative path and{" "}
          <strong>Hub repo ID</strong>.
        </Content>
        <Content component="li">
          Choose <strong>Publish now</strong>, then create a distribution under{" "}
          <strong>Distributions</strong>.
        </Content>
      </Content>
      <Content component="p">
        Publish again after content changes. Use <strong>Versions</strong> for snapshots
        and <strong>Access</strong> for permissions.
      </Content>
      <DistributionBasePathConvention prefix="hugging-face" />
    </Content>
  );
}
