import { Content } from "@patternfly/react-core";

import { RepositoryOperationsHelp } from "../RepositoryOperationsHelp";

import { DistributionBasePathConvention } from "../DistributionBasePathConvention";

export function GemRepositoriesTopic() {
  return (
    <Content>
      <Content component="ol">
        <Content component="li">
          Create a repository with a name and a default remote.
        </Content>
        <Content component="li">
          Choose <strong>Sync now</strong>, or use <strong>Content → Upload gem</strong>{" "}
          to add a <code>.gem</code> file.
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
      <RepositoryOperationsHelp />
      <DistributionBasePathConvention prefix="gem" />
    </Content>
  );
}
