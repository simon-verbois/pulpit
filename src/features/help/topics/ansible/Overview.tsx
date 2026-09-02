import { Content } from "@patternfly/react-core";

export function AnsibleOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Use this area to manage Ansible content: collections, roles, the repositories that
        hold them, and the remotes you sync from.
      </Content>
      <Content component="p">
        A repository can hold both collections and roles at once. Every sync, upload, or
        copy creates a new repository version, and a distribution is what actually makes a
        repository's content reachable by <code>ansible-galaxy</code> or Automation Hub
        clients.
      </Content>
      <Content component="p">
        Pick a page on the left for exactly how each one works:{" "}
        <strong>Repositories</strong> for creating/syncing/distributing,{" "}
        <strong>Collections</strong>/<strong>Roles</strong> for browsing content across
        every repository, <strong>Remotes</strong> for the three kinds of external source
        Pulp can pull from, <strong>Namespaces</strong> for Galaxy profile metadata, and{" "}
        <strong>Search</strong> for finding a collection without picking a repository
        first.
      </Content>
    </Content>
  );
}
