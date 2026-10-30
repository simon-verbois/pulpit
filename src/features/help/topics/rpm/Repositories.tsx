import { Content } from "@patternfly/react-core";

import { RepositoryOperationsHelp } from "../RepositoryOperationsHelp";

import { DistributionBasePathConvention } from "../DistributionBasePathConvention";

export function RpmRepositoriesTopic() {
  return (
    <Content>
      <Content component="ol">
        <Content component="li">
          Choose <strong>Create repository</strong>, enter a name and select a default
          remote.
        </Content>
        <Content component="li">
          Open the repository and choose <strong>Sync now</strong>. Follow progress in{" "}
          <strong>Tasks</strong>.
        </Content>
        <Content component="li">
          <strong>Automatically publish</strong> is on by default. Turn it off to use
          <strong> Publish now</strong> manually.
        </Content>
        <Content component="li">
          Open <strong>Distributions → Create distribution</strong>, then copy the client
          configuration. Follow the latest publication or pin a version.
        </Content>
      </Content>
      <Content component="p">
        Use <strong>Packages → Upload package</strong> to select or drop several RPMs.
        Retry failed files in the same form; accepted files are not uploaded again. Follow
        signing and repository completion in <strong>Tasks</strong>. Use{" "}
        <strong>Advisories</strong> to upload advisory JSON. <strong>Versions</strong>{" "}
        shows snapshots; <strong>Access</strong> controls permissions.
      </Content>
      <Content component="p">
        For cleanup, start <strong>Prune packages…</strong> with <strong>Dry run</strong>{" "}
        enabled to preview removals.
      </Content>
      <RepositoryOperationsHelp copy />
      <DistributionBasePathConvention prefix="rpm" />
    </Content>
  );
}
