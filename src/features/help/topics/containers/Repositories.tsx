import { Content } from "@patternfly/react-core";

import { RepositoryOperationsHelp } from "../RepositoryOperationsHelp";

import { DistributionBasePathConvention } from "../DistributionBasePathConvention";

export function ContainersRepositoriesTopic() {
  return (
    <Content>
      <Content component="ol">
        <Content component="li">
          Create a repository and select its default remote.
        </Content>
        <Content component="li">
          Choose <strong>Sync now</strong>.
        </Content>
        <Content component="li">
          Create a distribution under <strong>Distributions</strong> and copy its pull
          command. Enable <strong>Private</strong> to require login.
        </Content>
      </Content>
      <Content component="p">
        Use <strong>Tags</strong> to tag or untag images, <strong>Versions</strong> to
        copy a snapshot, and <strong>Access</strong> to manage permissions.
      </Content>
      <Content component="p">
        <strong>
          Deleting the last distribution that directly follows a repository also deletes
          that repository and its content. Pinned distributions have a different
          lifecycle.
        </strong>{" "}
        Check the confirmation carefully.
      </Content>
      <RepositoryOperationsHelp copy />
      <DistributionBasePathConvention prefix="container" />
    </Content>
  );
}
