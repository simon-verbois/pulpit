import { Content } from "@patternfly/react-core";

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
          Choose <strong>Publish now</strong>. <strong>Automatically publish</strong> is
          off by default.
        </Content>
        <Content component="li">
          Open <strong>Distributions → Create distribution</strong>, then copy the client
          configuration. Follow the latest publication or pin a version.
        </Content>
      </Content>
      <Content component="p">
        Use <strong>Packages</strong> to upload RPMs and <strong>Advisories</strong> to
        upload advisory JSON. <strong>Versions</strong> shows snapshots;{" "}
        <strong>Access</strong> controls permissions.
      </Content>
      <Content component="p">
        For cleanup, start <strong>Prune packages…</strong> with <strong>Dry run</strong>{" "}
        enabled to preview removals.
      </Content>
      <DistributionBasePathConvention prefix="rpm" />
    </Content>
  );
}
