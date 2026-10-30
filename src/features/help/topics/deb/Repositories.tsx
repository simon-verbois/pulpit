import { Content } from "@patternfly/react-core";

import { RepositoryOperationsHelp } from "../RepositoryOperationsHelp";

import { DistributionBasePathConvention } from "../DistributionBasePathConvention";

export function DebRepositoriesTopic() {
  return (
    <Content>
      <Content component="ol">
        <Content component="li">
          Create a repository with a name and a default remote.
        </Content>
        <Content component="li">
          Choose <strong>Sync now</strong>, or upload a <code>.deb</code> file from{" "}
          <strong>Content</strong>. Check its relative path.
        </Content>
        <Content component="li">
          Publication updates automatically by default. Disable{" "}
          <strong>Automatically publish</strong>
          to use <strong>Publish now</strong> manually.
        </Content>
        <Content component="li">
          Create a distribution under <strong>Distributions</strong> and copy its URL.
        </Content>
      </Content>
      <Content component="p">
        Use <strong>Versions</strong> for snapshots and <strong>Access</strong> for
        permissions.
      </Content>
      <RepositoryOperationsHelp />
      <DistributionBasePathConvention prefix="deb" />
    </Content>
  );
}
