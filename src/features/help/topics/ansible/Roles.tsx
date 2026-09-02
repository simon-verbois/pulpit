import { Content } from "@patternfly/react-core";

export function AnsibleRolesTopic() {
  return (
    <Content>
      <Content component="p">
        Lists every classic (pre-collections) Ansible role across <strong>every</strong>{" "}
        repository at once, with a search box by name. Roles appear here once a repository
        has synced content from a Role or Git remote, or a role has been uploaded
        directly.
      </Content>
      <Content component="p">
        This page is read-only — to add a role to a specific repository, use that
        repository's own <strong>Roles</strong> tab and its <strong>Upload role</strong>{" "}
        action (namespace, name, version, and a role tarball), or sync a Role/Git remote
        into it. See the Repositories and Remotes help pages.
      </Content>
    </Content>
  );
}
