import { Content } from "@patternfly/react-core";

import { RepositoryOperationsHelp } from "../RepositoryOperationsHelp";

import { DistributionBasePathConvention } from "../DistributionBasePathConvention";

export function FileRepositoriesTopic() {
  return (
    <Content>
      <Content component="ol">
        <Content component="li">
          Create a repository with a name and a default remote.
        </Content>
        <Content component="li">
          Choose <strong>Sync now</strong>, or use <strong>Content → Upload file</strong>{" "}
          and set the file's relative path.
        </Content>
        <Content component="li">
          Publication updates automatically by default. Disable{" "}
          <strong>Automatically publish</strong>
          to use <strong>Publish now</strong> manually.
        </Content>
        <Content component="li">
          Create a distribution under <strong>Distributions</strong> and copy its download
          URL.
        </Content>
      </Content>
      <Content component="p">
        The published file list is named <code>PULP_MANIFEST</code> unless you choose
        another name. If the download URL returns 404, check that the repository has been
        published.
      </Content>
      <RepositoryOperationsHelp />
      <DistributionBasePathConvention prefix="file" />
    </Content>
  );
}
