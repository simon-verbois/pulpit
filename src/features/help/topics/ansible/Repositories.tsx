import { Content } from "@patternfly/react-core";

import { DistributionBasePathConvention } from "../DistributionBasePathConvention";

export function AnsibleRepositoriesTopic() {
  return (
    <Content>
      <Content component="ol">
        <Content component="li">
          Create a repository with a name and a default remote.
        </Content>
        <Content component="li">
          Choose <strong>Sync now</strong>, or upload content from{" "}
          <strong>Collections</strong> or <strong>Roles</strong>.
        </Content>
        <Content component="li">
          Under <strong>Distributions</strong>, create a distribution and copy its{" "}
          <code>ansible.cfg</code> snippet. No publish step is needed.
        </Content>
      </Content>
      <Content component="p">
        Build collection uploads with <code>ansible-galaxy collection build</code>.
        Include <code>meta/runtime.yml</code> with <code>requires_ansible</code>.
      </Content>
      <Content component="p">
        Use the Overview actions to sign or mark collections, <strong>Versions</strong> to
        copy a snapshot, and <strong>Access</strong> to grant permissions.
      </Content>
      <DistributionBasePathConvention prefix="ansible" />
    </Content>
  );
}
