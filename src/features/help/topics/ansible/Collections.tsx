import { Content } from "@patternfly/react-core";

export function AnsibleCollectionsTopic() {
  return (
    <Content>
      <Content component="p">
        Lists every collection version across <strong>every</strong> Ansible repository at
        once — namespace, name, version, and tags. Use it to see what's available without
        picking a repository first; to add a collection to a specific repository, use that
        repository's own <strong>Collections</strong> tab instead (see the Repositories
        help page).
      </Content>

      <Content component="h3">Deprecating a collection</Content>
      <Content component="p">
        <strong>Deprecate collection…</strong> marks every version of a namespace+name
        collection as deprecated in Galaxy-compatible clients — it isn't scoped to one
        repository, but a repository still has to be specified (Pulp uses it to associate
        the deprecation marker). There's no un-deprecate action anywhere in Pulpit, so
        treat this as one-way.
      </Content>
      <Content component="p">
        Deprecating runs as a background task (watch the Tasks panel). A row already
        showing a <strong>Deprecated</strong> label above the table means Pulp already has
        a deprecation on file for that collection — deprecating it again is accepted but
        the task then fails.
      </Content>
    </Content>
  );
}
